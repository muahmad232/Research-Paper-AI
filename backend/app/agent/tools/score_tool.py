"""
Relevance Scoring Tool
Calculates semantic similarity, LLM relevance, keyword match, and recency scores.
Classifies papers and stores recommendations.

Weights: Cosine 40% | LLM 25% | Keyword 20% | Recency 15%
"""
import json
import logging
import math
from datetime import date, timedelta
from typing import Any, Dict, List, Optional
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
from app.database import get_db
from app.config import settings
from app.services.embedding_service import embed_single, cosine_similarity
from app.agent.prompts import LLM_RELEVANCE_SCORE_PROMPT

logger = logging.getLogger(__name__)

# ── Score weights ──────────────────────────────────────────────────────────────
W_COSINE  = 0.40
W_LLM     = 0.25
W_KEYWORD = 0.20
W_RECENCY = 0.15

# Cosine threshold below which we skip the LLM call (saves API cost)
LLM_COSINE_THRESHOLD = 25.0

# Classification thresholds (lowered so LLM signal is reflected)
HIGHLY_RELEVANT_THRESHOLD     = 68
POTENTIALLY_RELEVANT_THRESHOLD = 38

# LLM batch size (papers per single Groq call)
LLM_BATCH_SIZE = 10


def _recency_score(published_at_str: str) -> float:
    """Decay scoring: 100 for today, decays to ~50 at 14 days, 20 at 30 days."""
    try:
        pub_date = date.fromisoformat(published_at_str)
        days_old = max(0, (date.today() - pub_date).days)  # clamp: OpenAlex returns future dates
        return 100.0 * math.exp(-0.035 * days_old)
    except Exception:
        return 50.0


def _keyword_score(text: str, keywords: List[str]) -> float:
    """Count keyword matches normalized to 0-100. Forgiving ratio (0.4 denominator)."""
    if not keywords:
        return 70.0  # Don't penalize if no keywords are set
    text_lower = text.lower()
    matches = sum(1 for kw in keywords if kw.lower() in text_lower)
    return min(100.0, (matches / max(1, len(keywords) * 0.4)) * 100)


def _classify(score: float) -> str:
    if score >= HIGHLY_RELEVANT_THRESHOLD:
        return "highly_relevant"
    elif score >= POTENTIALLY_RELEVANT_THRESHOLD:
        return "potentially_relevant"
    else:
        return "not_relevant"


def _should_escalate(semantic: float, keyword: float, final: float) -> bool:
    """Escalate when signals conflict or score is in uncertain range."""
    in_uncertain_range = 50 <= final <= 70
    conflicting_signals = (semantic >= 70 and keyword <= 30) or (semantic <= 30 and keyword >= 70)
    return in_uncertain_range or conflicting_signals


def _llm_score_batch(
    papers: List[Dict],
    profile_text: str,
    llm: ChatGroq,
) -> List[float]:
    """
    Score a batch of papers against the profile using the LLM.
    Returns a list of floats (0-100) in the same order as input papers.
    Falls back to 50.0 on any error (neutral score, won't inflate or suppress).
    """
    papers_list = "\n".join(
        f"[{i}] {p.get('title', '')} — {(p.get('abstract') or '')[:500]}"
        for i, p in enumerate(papers)
    )
    prompt = LLM_RELEVANCE_SCORE_PROMPT.format(
        profile_text=profile_text,   # full profile text, no truncation
        papers_list=papers_list,
    )
    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        content = response.content.strip()
        # Strip markdown fences if present
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()

        parsed = json.loads(content)
        scores = [50.0] * len(papers)
        for item in parsed:
            idx = item.get("idx")
            score = item.get("score")
            if idx is not None and score is not None and 0 <= idx < len(papers):
                scores[idx] = float(max(0, min(100, score)))
        return scores
    except Exception as e:
        logger.warning(f"[ScoreTool] LLM batch scoring failed: {e}. Using neutral score.")
        return [50.0] * len(papers)


def run_score_tool(profile_id: str) -> Dict[str, Any]:
    """
    Score all recently fetched papers against the user profile.
    Skips papers that already have a recommendation for this profile.
    Creates/updates recommendation records in DB.
    """
    db = get_db()

    # Load profile
    profile_resp = db.table("user_profiles").select("*").eq("id", profile_id).single().execute()
    profile = profile_resp.data
    if not profile:
        return {"error": "Profile not found"}

    interests = [i for i in (profile.get("research_interests") or []) if i]
    keywords  = [k for k in (profile.get("keywords") or []) if k]
    excluded  = [e for e in (profile.get("excluded_topics") or []) if e]

    # Build profile text for embedding + LLM prompt
    profile_text = " ".join(interests + keywords)
    if not profile_text.strip():
        logger.info(f"[ScoreTool] Profile {profile_id} has no interests/keywords — skipping.")
        return {"scored": 0, "highly_relevant": 0, "potentially_relevant": 0, "escalated": 0}

    profile_emb = embed_single(profile_text)

    # Get paper IDs already scored for this profile (skip re-scoring)
    existing_recs_resp = (
        db.table("recommendations")
        .select("paper_id")
        .eq("profile_id", profile_id)
        .execute()
    )
    already_scored_ids = {r["paper_id"] for r in (existing_recs_resp.data or [])}

    # Fetch window is 7 days, so 14 days is safe. Use published_at so papers fetched
    # previously for other users are still picked up for this user.
    cutoff_date = (date.today() - timedelta(days=14)).isoformat()

    # Load recently published papers that have embeddings
    papers_resp = (
        db.table("papers")
        .select("id, title, abstract, categories, published_at, embedding")
        .not_.is_("embedding", "null")
        .gte("published_at", cutoff_date)
        .limit(200)
        .execute()
    )
    papers = papers_resp.data or []

    # Filter out already-scored and excluded-topic papers
    papers = [p for p in papers if p["id"] not in already_scored_ids]

    if not papers:
        logger.info(f"[ScoreTool] No new papers to score for profile {profile_id}.")
        return {"scored": 0, "highly_relevant": 0, "potentially_relevant": 0, "escalated": 0}

    # ── Step 1: Compute cosine scores for all papers ───────────────────────────
    scored_papers = []  # (paper, sem_score, kw_score, rec_score, paper_emb_list)
    for paper in papers:
        title    = paper.get("title", "")
        abstract = paper.get("abstract", "") or ""
        full_text = f"{title}. {abstract}"

        # Excluded topics check
        if excluded and any(ex.lower() in full_text.lower() for ex in excluded):
            continue

        paper_emb = paper.get("embedding")
        if not paper_emb:
            continue

        if isinstance(paper_emb, str):
            try:
                paper_emb = json.loads(paper_emb)
            except Exception:
                logger.error(f"[ScoreTool] Failed to parse embedding for paper {paper['id']}")
                continue

        sem_score = round(cosine_similarity(profile_emb, paper_emb) * 100, 2)
        kw_score  = round(_keyword_score(full_text, keywords), 2)
        rec_score = round(_recency_score(paper.get("published_at") or ""), 2)

        scored_papers.append({
            "paper":     paper,
            "sem_score": sem_score,
            "kw_score":  kw_score,
            "rec_score": rec_score,
        })

    if not scored_papers:
        return {"scored": 0, "highly_relevant": 0, "potentially_relevant": 0, "escalated": 0}

    # ── Step 2: LLM scoring — only for papers above cosine threshold ──────────
    llm = ChatGroq(
        api_key=settings.groq_api_key,
        model_name="openai/gpt-oss-20b",
        temperature=0.1,
        max_tokens=1024,
    )

    # Separate candidates (above threshold) from clear rejects
    llm_candidates = [sp for sp in scored_papers if sp["sem_score"] >= LLM_COSINE_THRESHOLD]
    llm_rejects    = [sp for sp in scored_papers if sp["sem_score"] < LLM_COSINE_THRESHOLD]

    # Assign default LLM score for clear rejects
    for sp in llm_rejects:
        sp["llm_score"] = 0.0

    # Batch LLM calls for candidates
    for i in range(0, len(llm_candidates), LLM_BATCH_SIZE):
        batch = llm_candidates[i : i + LLM_BATCH_SIZE]
        papers_in_batch = [sp["paper"] for sp in batch]
        llm_scores = _llm_score_batch(papers_in_batch, profile_text, llm)
        for sp, llm_sc in zip(batch, llm_scores):
            sp["llm_score"] = llm_sc

    # ── Step 3: Compute final weighted scores + build recommendations ──────────
    all_scored = llm_candidates + llm_rejects
    stats = {"scored": 0, "highly_relevant": 0, "potentially_relevant": 0, "escalated": 0}
    recommendations = []

    for sp in all_scored:
        sem_score = sp["sem_score"]
        kw_score  = sp["kw_score"]
        rec_score = sp["rec_score"]
        llm_score = sp["llm_score"]
        paper     = sp["paper"]

        final = round(
            sem_score * W_COSINE +
            llm_score * W_LLM    +
            kw_score  * W_KEYWORD +
            rec_score * W_RECENCY,
            2
        )
        category = _classify(final)
        escalate  = _should_escalate(sem_score, kw_score, final)

        explanation = {
            "semantic_similarity": {
                "score": sem_score, "weight": W_COSINE,
                "contribution": round(sem_score * W_COSINE, 2)
            },
            "llm_relevance": {
                "score": llm_score, "weight": W_LLM,
                "contribution": round(llm_score * W_LLM, 2)
            },
            "keyword_match": {
                "score": kw_score, "weight": W_KEYWORD,
                "contribution": round(kw_score * W_KEYWORD, 2)
            },
            "recency": {
                "score": rec_score, "weight": W_RECENCY,
                "contribution": round(rec_score * W_RECENCY, 2)
            },
            "matched_keywords": [kw for kw in keywords if kw.lower() in f"{paper.get('title', '')} {paper.get('abstract', '')}".lower()],
            "matched_interests": [i for i in interests if i.lower() in f"{paper.get('title', '')} {paper.get('abstract', '')}".lower()],
        }

        recommendations.append({
            "paper_id":       paper["id"],
            "profile_id":     profile_id,
            "semantic_score": sem_score,
            "keyword_score":  kw_score,
            "recency_score":  rec_score,
            "final_score":    final,
            "category":       category,
            "explanation":    explanation,
            "escalated":      escalate,
        })

        stats["scored"] += 1
        if category == "highly_relevant":
            stats["highly_relevant"] += 1
        elif category == "potentially_relevant":
            stats["potentially_relevant"] += 1
        if escalate:
            stats["escalated"] += 1

    # ── Step 4: Bulk upsert all recommendations ────────────────────────────────
    if recommendations:
        chunk_size = 100
        for i in range(0, len(recommendations), chunk_size):
            chunk = recommendations[i : i + chunk_size]
            try:
                db.table("recommendations").upsert(
                    chunk,
                    on_conflict="paper_id,profile_id",
                ).execute()
            except Exception as e:
                logger.error(f"[ScoreTool] Bulk upsert failed: {e}")

    logger.info(f"[ScoreTool] {stats}")
    return stats
