"""
Agent Orchestrator — Runs the complete daily pipeline for ALL active user profiles.
Called by POST /agent/run
"""
import logging
from datetime import date, datetime, timezone
from typing import Any, Dict
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


def _now_iso() -> str:
    """Return current UTC time as ISO string — safe for Supabase TIMESTAMPTZ columns."""
    return datetime.now(timezone.utc).isoformat()


def run_daily_agent() -> Dict[str, Any]:
    """
    Execute the full daily agent pipeline for every user profile in the DB.

    Steps per profile:
    1. Fetch papers (shared across all users)
    2. Generate embeddings (shared)
    3. Score & classify per profile
    4. LLM analysis on highly relevant
    5. Research gap detection
    6. Escalation summary
    7. Generate daily digest
    """
    db = get_db()
    run_log = []

    # Create run record
    run_resp = db.table("agent_runs").insert({"status": "running"}).execute()
    run_id = run_resp.data[0]["id"]

    def log_step(step: str, result: Any):
        msg = f"[{step}] {result}"
        logger.info(msg)
        run_log.append(msg)
        try:
            db.table("agent_runs").update({
                "log": "\n".join(run_log[-10:]), # Keep last 10 lines for UI to parse easily
            }).eq("id", run_id).execute()
        except Exception:
            pass

    total_fetch = {}
    total_embed = {}

    try:
        # ── Step 0: Get User Profiles ─────────────────────────────────────
        profiles_resp = db.table("user_profiles").select("id, user_id, research_interests, keywords, excluded_topics, users(name)").execute()
        profiles = profiles_resp.data or []

        if not profiles:
            log_step("Profiles", "No user profiles found — skipping pipeline.")
            return {"status": "completed", "run_id": run_id}
            
        log_step("Profiles", f"Processing {len(profiles)} profile(s)")

        # ── Step 1: Fetch papers PER USER using LLM ──────────
        from app.agent.prompts import GENERATE_SEARCH_QUERY_PROMPT
        import json
        
        llm = ChatGroq(api_key=settings.groq_api_key, model_name="llama-3.1-8b-instant", temperature=0.1)
        total_fetch = {"total_fetched": 0, "arxiv_count": 0, "openalex_count": 0, "inserted": 0, "skipped": 0}
        
        # We divide the total max papers by the number of profiles so we don't blow up the DB
        papers_per_profile = max(10, settings.max_papers_per_run // len(profiles))

        for profile in profiles:
            profile_id = profile["id"]
            log_step(f"Fetch:{profile_id[:8]}", "Generating personalized search query...")
            
            interests = profile.get("research_interests") or []
            keywords = profile.get("keywords") or []
            
            query_terms = ["machine learning"]
            categories = ["cs.LG"]
            
            if interests or keywords:
                try:
                    search_prompt = GENERATE_SEARCH_QUERY_PROMPT.format(
                        interests=", ".join(interests) if interests else "None",
                        keywords=", ".join(keywords) if keywords else "None"
                    )
                    
                    search_response = llm.invoke([HumanMessage(content=search_prompt)])
                    content = search_response.content
                    json_str = content[content.find("{"):content.rfind("}")+1]
                    search_data = json.loads(json_str)
                    
                    query_terms = search_data.get("query_terms", query_terms)[:3]
                    categories = search_data.get("categories", categories)[:3]
                except Exception as e:
                    logger.warning(f"[Orchestrator] Failed to generate search query for {profile_id}: {e}")
                    
            log_step(f"Fetch:{profile_id[:8]}", f"Terms: {query_terms}, Cats: {categories}")
            
            fetch_result = run_fetch_tool(
                query_terms=query_terms,
                categories=categories,
                max_papers=papers_per_profile,
            )
            
            for k in total_fetch.keys():
                total_fetch[k] += fetch_result.get(k, 0)

        log_step("FetchSummary", total_fetch)

        # ── Step 2: Generate embeddings (once, shared) ────────────────────
        embed_result = run_embed_tool()
        log_step("Embed", embed_result)
        total_embed = embed_result

        # ── Step 3–7: Run per-user profile processing ─────────────────────
        all_score_results = []

        for profile in profiles:
            profile_id = profile["id"]
            log_step(f"Profile:{profile_id[:8]}", "Starting per-user pipeline")

            # Score & classify
            score_result = run_score_tool(profile_id)
            log_step(f"Score:{profile_id[:8]}", score_result)
            all_score_results.append(score_result)

            # LLM analysis
            analyze_result = run_analyze_tool(profile_id)
            log_step(f"Analyze:{profile_id[:8]}", analyze_result)

            # Research gap detection
            gap_result = run_gap_tool(profile_id)
            log_step(f"Gaps:{profile_id[:8]}", gap_result)

            # Escalation summary
            escalation_result = run_escalation_tool(profile_id)
            log_step(f"Escalation:{profile_id[:8]}", escalation_result)

            # Daily Digest
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
                    papers_resp = db.table("papers").select("title").in_("id", top_paper_ids).execute()
                    top_titles = "\n".join([f"- {p['title']}" for p in (papers_resp.data or [])])

                user_name = profile.get("users", {}).get("name", "Researcher") if profile.get("users") else "Researcher"
                
                interests = profile.get("research_interests") or []
                digest_prompt = DAILY_DIGEST_PROMPT.format(
                    user_name=user_name,
                    current_date=date.today().strftime("%B %d, %Y"),
                    interests=", ".join(interests),
                    total_fetched=fetch_result.get("total_fetched", 0),
                    highly_relevant=score_result.get("highly_relevant", 0),
                    potentially_relevant=score_result.get("potentially_relevant", 0),
                    escalated=escalation_result.get("escalation_count", 0),
                    top_papers=top_titles or "No highly relevant papers found today.",
                )

                try:
                    llm = ChatGroq(api_key=settings.groq_api_key, model_name="llama-3.1-8b-instant", temperature=0.4)
                    digest_response = llm.invoke([HumanMessage(content=digest_prompt)])
                    digest_summary = digest_response.content.strip()
                except Exception as e:
                    logger.warning(f"[Orchestrator] Digest LLM error: {e}")
                    digest_summary = f"Agent run completed. {score_result.get('highly_relevant', 0)} highly relevant papers found."

                db.table("daily_digests").upsert(
                    {
                        "profile_id": profile_id,
                        "digest_date": date.today().isoformat(),
                        "total_fetched": fetch_result.get("total_fetched", 0),
                        "highly_relevant": score_result.get("highly_relevant", 0),
                        "potentially_relevant": score_result.get("potentially_relevant", 0),
                        "escalated": escalation_result.get("escalation_count", 0),
                        "summary": digest_summary,
                        "top_paper_ids": top_paper_ids,
                    },
                    on_conflict="profile_id,digest_date",
                ).execute()

                log_step(f"Digest:{profile_id[:8]}", "Generated and saved")
            except Exception as e:
                logger.error(f"[Orchestrator] Digest error for profile {profile_id}: {e}")

        # ── Mark run as completed ─────────────────────────────────────────
        # FIX: Use Python datetime — Supabase REST client does NOT evaluate SQL expressions like "now()"
        db.table("agent_runs").update({
            "status": "completed",
            "completed_at": _now_iso(),
            "papers_fetched": total_fetch.get("total_fetched", 0),
            "papers_processed": sum(s.get("scored", 0) for s in all_score_results),
            "log": "[DONE] Pipeline finished.",
        }).eq("id", run_id).execute()

        return {
            "status": "completed",
            "run_id": run_id,
            "fetch": total_fetch,
            "embed": total_embed,
            "profiles_processed": len(profiles),
        }

    except Exception as e:
        logger.error(f"[Orchestrator] Fatal error: {e}")
        run_log.append(f"FATAL: {e}")
        # FIX: Same fix in the error path
        db.table("agent_runs").update({
            "status": "failed",
            "completed_at": _now_iso(),
            "errors": [str(e)],
            "log": "\n".join(run_log),
        }).eq("id", run_id).execute()
        raise
