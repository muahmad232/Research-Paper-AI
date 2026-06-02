"""
Agent Orchestrator — Runs the complete daily pipeline.

Two modes:
  - User-triggered (POST /agent/run):   runs ONLY for the calling user's profile.
  - Scheduled     (POST /agent/run-all): runs for ALL profiles (GitHub Actions at 7 AM).

Pipeline steps (9 total — each logged with [STEP:N/9] for frontend progress parsing):
  1. Profiles      — load user profile(s)
  2. Fetch         — fetch papers from arXiv + OpenAlex
  3. Embed         — generate embeddings for new papers
  4. Score         — relevance scoring per user profile
  5. Analyze       — LLM deep analysis of highly relevant papers
  6. Gaps          — research gap detection
  7. Escalation    — flag uncertain papers for manual review
  8. Digest        — generate daily digest
  9. Done          — mark run as complete
"""
import logging
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage

from app.config import settings
from app.database import get_db
from app.agent.tools.fetch_tool import run_fetch_tool
from app.agent.tools.embed_tool import run_embed_tool
from app.agent.tools.score_tool import run_score_tool
from app.agent.tools.analyze_tool import run_analyze_tool
from app.agent.tools.gap_tool import run_gap_tool
from app.agent.tools.escalation_tool import run_escalation_tool
from app.agent.prompts import DAILY_DIGEST_PROMPT

logger = logging.getLogger(__name__)

PIPELINE_STEPS = [
    "Loading profiles",       # 1
    "Fetching papers",        # 2
    "Generating embeddings",  # 3
    "Scoring papers",         # 4
    "Analyzing papers",       # 5
    "Finding research gaps",  # 6
    "Flagging escalations",   # 7
    "Generating digest",      # 8
    "Done",                   # 9
]
TOTAL_STEPS = len(PIPELINE_STEPS)

# Max papers to fetch per user profile (kept small for speed)
PAPERS_PER_PROFILE = 20


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _run_pipeline(profiles: List[Dict], run_id: str, db, log_step_fn) -> Dict[str, Any]:
    """
    Core pipeline logic — shared between single-user and all-user runs.
    """
    from app.agent.prompts import GENERATE_SEARCH_QUERY_PROMPT
    import json

    llm = ChatGroq(
        api_key=settings.groq_api_key,
        model_name="llama-3.1-8b-instant",
        temperature=0.1,
    )

    # ── Step 2: Fetch papers (one LLM-generated query per profile) ─────────────
    log_step_fn(2, PIPELINE_STEPS[1])
    total_fetch = {
        "total_fetched": 0, "arxiv_count": 0,
        "openalex_count": 0, "inserted": 0, "skipped": 0,
    }

    for profile in profiles:
        profile_id = profile["id"]
        interests  = profile.get("research_interests") or []
        keywords   = profile.get("keywords") or []

        query_terms = ["machine learning"]
        categories  = ["cs.LG"]
        if interests or keywords:
            try:
                search_prompt = GENERATE_SEARCH_QUERY_PROMPT.format(
                    interests=", ".join(interests) if interests else "None",
                    keywords=", ".join(keywords)  if keywords  else "None",
                )
                resp     = llm.invoke([HumanMessage(content=search_prompt)])
                content  = resp.content
                json_str = content[content.find("{"):content.rfind("}") + 1]
                data     = json.loads(json_str)
                query_terms = data.get("query_terms", query_terms)[:3]
                categories  = data.get("categories",  categories)[:3]
            except Exception as e:
                logger.warning(f"[Orchestrator] Search query LLM error for {profile_id}: {e}")

        log_step_fn(2, PIPELINE_STEPS[1], f"{profile_id[:8]} → {query_terms}")
        fetch_result = run_fetch_tool(
            query_terms=query_terms,
            categories=categories,
            max_papers=PAPERS_PER_PROFILE,
        )
        for k in total_fetch:
            total_fetch[k] += fetch_result.get(k, 0)

    log_step_fn(2, PIPELINE_STEPS[1],
                f"{total_fetch['total_fetched']} fetched, {total_fetch['inserted']} new")

    # ── Step 3: Embeddings (shared, once) ──────────────────────────────────────
    log_step_fn(3, PIPELINE_STEPS[2])
    embed_result = run_embed_tool()
    log_step_fn(3, PIPELINE_STEPS[2], f"{embed_result.get('processed', 0)} embedded")

    # ── Steps 4–8: Per-profile processing ──────────────────────────────────────
    all_score_results = []

    for profile in profiles:
        profile_id = profile["id"]
        user_name  = (
            profile.get("users", {}).get("name", "Researcher")
            if profile.get("users") else "Researcher"
        )
        interests_list = profile.get("research_interests") or []

        # Step 4: Score
        log_step_fn(4, PIPELINE_STEPS[3], f"Profile {profile_id[:8]}")
        score_result = run_score_tool(profile_id)
        log_step_fn(4, PIPELINE_STEPS[3],
                    f"{score_result.get('scored', 0)} scored, "
                    f"{score_result.get('highly_relevant', 0)} highly relevant")
        all_score_results.append(score_result)

        # Step 5: Analyze
        log_step_fn(5, PIPELINE_STEPS[4], f"Profile {profile_id[:8]}")
        analyze_result = run_analyze_tool(profile_id)
        log_step_fn(5, PIPELINE_STEPS[4], f"{analyze_result.get('analyzed', 0)} analyzed")

        # Step 6: Gaps
        log_step_fn(6, PIPELINE_STEPS[5], f"Profile {profile_id[:8]}")
        gap_result = run_gap_tool(profile_id)
        log_step_fn(6, PIPELINE_STEPS[5], f"{gap_result.get('gaps_created', 0)} gaps")

        # Step 7: Escalations
        log_step_fn(7, PIPELINE_STEPS[6], f"Profile {profile_id[:8]}")
        escalation_result = run_escalation_tool(profile_id)
        log_step_fn(7, PIPELINE_STEPS[6],
                    f"{escalation_result.get('escalation_count', 0)} flagged")

        # Step 8: Digest
        log_step_fn(8, PIPELINE_STEPS[7], f"Profile {profile_id[:8]}")
        try:
            top_recs_resp = (
                db.table("recommendations")
                .select("paper_id, final_score")
                .eq("profile_id", profile_id)
                .eq("category", "highly_relevant")
                .order("final_score", desc=True)
                .limit(5)
                .execute()
            )
            top_paper_ids = [r["paper_id"] for r in (top_recs_resp.data or [])]

            top_titles = ""
            if top_paper_ids:
                papers_resp = (
                    db.table("papers").select("title").in_("id", top_paper_ids).execute()
                )
                top_titles = "\n".join(
                    [f"- {p['title']}" for p in (papers_resp.data or [])]
                )

            digest_prompt = DAILY_DIGEST_PROMPT.format(
                user_name=user_name,
                current_date=date.today().strftime("%B %d, %Y"),
                interests=", ".join(interests_list),
                total_fetched=total_fetch.get("total_fetched", 0),
                highly_relevant=score_result.get("highly_relevant", 0),
                potentially_relevant=score_result.get("potentially_relevant", 0),
                escalated=escalation_result.get("escalation_count", 0),
                top_papers=top_titles or "No highly relevant papers found today.",
            )

            try:
                digest_llm = ChatGroq(
                    api_key=settings.groq_api_key,
                    model_name="llama-3.1-8b-instant",
                    temperature=0.4,
                )
                digest_resp = digest_llm.invoke([HumanMessage(content=digest_prompt)])
                digest_summary = digest_resp.content.strip()
            except Exception as e:
                logger.warning(f"[Orchestrator] Digest LLM error: {e}")
                digest_summary = (
                    f"Agent run completed. "
                    f"{score_result.get('highly_relevant', 0)} highly relevant papers found."
                )

            db.table("daily_digests").upsert(
                {
                    "profile_id":           profile_id,
                    "digest_date":          date.today().isoformat(),
                    "total_fetched":        total_fetch.get("total_fetched", 0),
                    "highly_relevant":      score_result.get("highly_relevant", 0),
                    "potentially_relevant": score_result.get("potentially_relevant", 0),
                    "escalated":            escalation_result.get("escalation_count", 0),
                    "summary":              digest_summary,
                    "top_paper_ids":        top_paper_ids,
                },
                on_conflict="profile_id,digest_date",
            ).execute()
            log_step_fn(8, PIPELINE_STEPS[7], "Digest saved")
        except Exception as e:
            logger.error(f"[Orchestrator] Digest error for {profile_id}: {e}")

    return {
        "total_fetch":        total_fetch,
        "embed":              embed_result,
        "all_score_results":  all_score_results,
    }


def run_agent_for_user(user_id: str) -> Dict[str, Any]:
    """
    Run the full pipeline for a SINGLE user (triggered manually via the UI).
    Only loads and processes the profile belonging to user_id.
    """
    db     = get_db()
    run_log = []

    run_resp = db.table("agent_runs").insert({"status": "running"}).execute()
    run_id   = run_resp.data[0]["id"]

    def log_step(step_num: int, step_label: str, detail: Any = ""):
        msg = f"[STEP:{step_num}/{TOTAL_STEPS}] {step_label}"
        if detail:
            msg += f" — {detail}"
        logger.info(msg)
        run_log.append(msg)
        try:
            db.table("agent_runs").update({
                "log": "\n".join(run_log[-15:]),
            }).eq("id", run_id).execute()
        except Exception:
            pass

    try:
        # Step 1: Load THIS user's profile only
        log_step(1, PIPELINE_STEPS[0])
        profile_resp = (
            db.table("user_profiles")
            .select("id, user_id, research_interests, keywords, excluded_topics, users(name)")
            .eq("user_id", user_id)
            .execute()
        )
        profiles = profile_resp.data or []

        if not profiles:
            log_step(9, PIPELINE_STEPS[8], "No profile found — pipeline skipped.")
            db.table("agent_runs").update({
                "status":       "completed",
                "completed_at": _now_iso(),
                "log":          "\n".join(run_log),
            }).eq("id", run_id).execute()
            return {"status": "completed", "run_id": run_id, "note": "no profile"}

        log_step(1, PIPELINE_STEPS[0], f"Profile loaded for user {user_id[:8]}")

        result = _run_pipeline(profiles, run_id, db, log_step)

        total_fetch       = result["total_fetch"]
        all_score_results = result["all_score_results"]

        log_step(9, PIPELINE_STEPS[8],
                 f"{total_fetch.get('total_fetched', 0)} fetched, "
                 f"{sum(s.get('scored', 0) for s in all_score_results)} scored")

        db.table("agent_runs").update({
            "status":           "completed",
            "completed_at":     _now_iso(),
            "papers_fetched":   total_fetch.get("total_fetched", 0),
            "papers_processed": sum(s.get("scored", 0) for s in all_score_results),
            "log":              "[STEP:9/9] Done — Pipeline finished.",
        }).eq("id", run_id).execute()

        return {"status": "completed", "run_id": run_id, "fetch": total_fetch}

    except Exception as e:
        logger.error(f"[Orchestrator] Fatal error (user {user_id}): {e}")
        run_log.append(f"FATAL: {e}")
        db.table("agent_runs").update({
            "status":       "failed",
            "completed_at": _now_iso(),
            "errors":       [str(e)],
            "log":          "\n".join(run_log),
        }).eq("id", run_id).execute()
        raise


def run_daily_agent() -> Dict[str, Any]:
    """
    Run the full pipeline for ALL user profiles.
    Called by the GitHub Actions scheduled job at 7 AM UTC.
    """
    db      = get_db()
    run_log = []

    run_resp = db.table("agent_runs").insert({"status": "running"}).execute()
    run_id   = run_resp.data[0]["id"]

    def log_step(step_num: int, step_label: str, detail: Any = ""):
        msg = f"[STEP:{step_num}/{TOTAL_STEPS}] {step_label}"
        if detail:
            msg += f" — {detail}"
        logger.info(msg)
        run_log.append(msg)
        try:
            db.table("agent_runs").update({
                "log": "\n".join(run_log[-15:]),
            }).eq("id", run_id).execute()
        except Exception:
            pass

    try:
        # Step 1: Load ALL profiles
        log_step(1, PIPELINE_STEPS[0])
        profiles_resp = (
            db.table("user_profiles")
            .select("id, user_id, research_interests, keywords, excluded_topics, users(name)")
            .execute()
        )
        profiles = profiles_resp.data or []

        if not profiles:
            log_step(9, PIPELINE_STEPS[8], "No profiles found — pipeline skipped.")
            db.table("agent_runs").update({
                "status":       "completed",
                "completed_at": _now_iso(),
                "log":          "\n".join(run_log),
            }).eq("id", run_id).execute()
            return {"status": "completed", "run_id": run_id}

        log_step(1, PIPELINE_STEPS[0], f"{len(profiles)} profile(s) found")

        result = _run_pipeline(profiles, run_id, db, log_step)

        total_fetch       = result["total_fetch"]
        all_score_results = result["all_score_results"]

        log_step(9, PIPELINE_STEPS[8],
                 f"{total_fetch.get('total_fetched', 0)} fetched, "
                 f"{sum(s.get('scored', 0) for s in all_score_results)} scored")

        db.table("agent_runs").update({
            "status":           "completed",
            "completed_at":     _now_iso(),
            "papers_fetched":   total_fetch.get("total_fetched", 0),
            "papers_processed": sum(s.get("scored", 0) for s in all_score_results),
            "log":              "[STEP:9/9] Done — Pipeline finished.",
        }).eq("id", run_id).execute()

        return {
            "status":             "completed",
            "run_id":             run_id,
            "fetch":              total_fetch,
            "profiles_processed": len(profiles),
        }

    except Exception as e:
        logger.error(f"[Orchestrator] Fatal error (scheduled run): {e}")
        run_log.append(f"FATAL: {e}")
        db.table("agent_runs").update({
            "status":       "failed",
            "completed_at": _now_iso(),
            "errors":       [str(e)],
            "log":          "\n".join(run_log),
        }).eq("id", run_id).execute()
        raise
