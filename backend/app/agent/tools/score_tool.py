"""
Relevance Scoring Tool
Calculates semantic similarity, keyword match, and recency scores.
Classifies papers and stores recommendations.
"""
import logging
import math
from datetime import date, timedelta
from typing import Any, Dict, List
from app.database import get_db
from app.services.embedding_service import embed_single, cosine_similarity

logger = logging.getLogger(__name__)


def _recency_score(published_at_str: str) -> float:
    """Decay scoring: 100 for today, decays to ~50 at 7 days, 20 at 30 days."""
    try:
        pub_date = date.fromisoformat(published_at_str)
        days_old = max(0, (date.today() - pub_date).days)
        return 100.0 * math.exp(-0.05 * days_old)
    except Exception:
        return 50.0


def _keyword_score(text: str, keywords: List[str]) -> float:
    """Count keyword matches normalized to 0-100. More forgiving."""
    if not keywords:
        return 70.0  # Don't penalize if no keywords are set
    text_lower = text.lower()
    matches = sum(1 for kw in keywords if kw.lower() in text_lower)
    return min(100.0, (matches / max(1, len(keywords) * 0.5)) * 100)


def _classify(score: float) -> str:
    if score >= 75:
        return "highly_relevant"
    elif score >= 40:
        return "potentially_relevant"
    else:
        return "not_relevant"


def _should_escalate(semantic: float, keyword: float, final: float) -> bool:
    """Escalate when signals conflict or score is in uncertain range."""
    in_uncertain_range = 50 <= final <= 70
    conflicting_signals = (semantic >= 70 and keyword <= 30) or (semantic <= 30 and keyword >= 70)
    return in_uncertain_range or conflicting_signals


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

    interests = profile.get("research_interests") or []
    keywords = profile.get("keywords") or []
    excluded = profile.get("excluded_topics") or []

    # Build profile text embedding
    profile_text = " ".join(interests + keywords)
    if not profile_text.strip():
        logger.info(f"[ScoreTool] Profile {profile_id} has no interests/keywords — skipping.")
        return {"scored": 0, "highly_relevant": 0, "potentially_relevant": 0, "escalated": 0}

    profile_emb = embed_single(profile_text)

    # FIX: Get paper IDs that already have a recommendation for this profile
    existing_recs_resp = (
        db.table("recommendations")
        .select("paper_id")
        .eq("profile_id", profile_id)
        .execute()
    )
    already_scored_ids = {r["paper_id"] for r in (existing_recs_resp.data or [])}

    # FIX: Use proper timedelta import (not __import__ hack)
    cutoff_date = (date.today() - timedelta(days=2)).isoformat()

    # Load recently fetched papers that have embeddings
    papers_resp = (
        db.table("papers")
        .select("id, title, abstract, categories, published_at, embedding")
        .not_.is_("embedding", "null")
        .gte("fetched_at", cutoff_date)
        .limit(300)
        .execute()
    )
    papers = papers_resp.data or []

    # Filter out already-scored papers
    papers = [p for p in papers if p["id"] not in already_scored_ids]

    if not papers:
        logger.info(f"[ScoreTool] No new papers to score for profile {profile_id}.")
        return {"scored": 0, "highly_relevant": 0, "potentially_relevant": 0, "escalated": 0}

    stats = {"scored": 0, "highly_relevant": 0, "potentially_relevant": 0, "escalated": 0}

    for paper in papers:
        title = paper.get("title", "")
        abstract = paper.get("abstract", "") or ""
        full_text = f"{title}. {abstract}"

        # Check if excluded topics appear
        if excluded and any(ex.lower() in full_text.lower() for ex in excluded):
            continue

        paper_emb = paper.get("embedding")
        if not paper_emb:
            continue

        # PostgREST returns pgvector as a string, e.g. "[-0.01, 0.02, ...]"
        if isinstance(paper_emb, str):
            import json
            try:
                paper_emb = json.loads(paper_emb)
            except Exception:
                logger.error(f"[ScoreTool] Failed to parse embedding string for paper {paper['id']}")
                continue

        # Scores
        sem_score = round(cosine_similarity(profile_emb, paper_emb) * 100, 2)
        kw_score = round(_keyword_score(full_text, keywords), 2)
        rec_score = round(_recency_score(paper.get("published_at") or ""), 2)

        # Weighted final score
        final = round(sem_score * 0.60 + kw_score * 0.30 + rec_score * 0.10, 2)
        category = _classify(final)
        escalate = _should_escalate(sem_score, kw_score, final)

        explanation = {
            "semantic_similarity": {"score": sem_score, "weight": 0.55, "contribution": round(sem_score * 0.55, 2)},
            "keyword_match": {"score": kw_score, "weight": 0.30, "contribution": round(kw_score * 0.30, 2)},
            "recency": {"score": rec_score, "weight": 0.15, "contribution": round(rec_score * 0.15, 2)},
            "matched_keywords": [kw for kw in keywords if kw.lower() in full_text.lower()],
            "matched_interests": [i for i in interests if i.lower() in full_text.lower()],
        }

        # Upsert recommendation
        try:
            db.table("recommendations").upsert(
                {
                    "paper_id": paper["id"],
                    "profile_id": profile_id,
                    "semantic_score": sem_score,
                    "keyword_score": kw_score,
                    "recency_score": rec_score,
                    "final_score": final,
                    "category": category,
                    "explanation": explanation,
                    "escalated": escalate,
                },
                on_conflict="paper_id,profile_id",
            ).execute()
            stats["scored"] += 1
            if category == "highly_relevant":
                stats["highly_relevant"] += 1
            elif category == "potentially_relevant":
                stats["potentially_relevant"] += 1
            if escalate:
                stats["escalated"] += 1
        except Exception as e:
            logger.error(f"[ScoreTool] Upsert failed: {e}")

    logger.info(f"[ScoreTool] {stats}")
    return stats
