"""
Agent Orchestrator — Runs the complete daily pipeline sequentially.
This is the main entry point called by POST /run-daily-agent
"""
import logging
from datetime import date
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


async def run_daily_agent() -> Dict[str, Any]:
    """
    Execute the full daily agent pipeline:
    1. Fetch papers
    2. Generate embeddings
    3. Score & classify
    4. LLM analysis (highly relevant only)
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
        # ── Step 1: Get or create profile ──────────────────────────────
        profile_resp = db.table("user_profiles").select("id").limit(1).execute()
        if not profile_resp.data:
            # Create default profile
            new_profile = db.table("user_profiles").insert({
                "research_interests": ["LLM Agents", "RAG", "Healthcare AI"],
                "keywords": ["RAG", "multi-agent", "hallucination", "transformer"],
                "excluded_topics": ["computer vision", "robotics"],
            }).execute()
            profile_id = new_profile.data[0]["id"]
        else:
            profile_id = profile_resp.data[0]["id"]

        log_step("Profile", f"Using profile {profile_id}")

        # ── Step 2: Fetch papers ────────────────────────────────────────
        query_terms = settings.arxiv_query_terms.split(",")
        categories = settings.arxiv_categories.split(",")

        fetch_result = run_fetch_tool(
            query_terms=query_terms,
            categories=categories,
            max_papers=settings.max_papers_per_run,
        )
        log_step("Fetch", fetch_result)

        # ── Step 3: Generate embeddings ─────────────────────────────────
        embed_result = run_embed_tool()
        log_step("Embed", embed_result)

        # ── Step 4: Score & classify ────────────────────────────────────
        score_result = run_score_tool(profile_id)
        log_step("Score", score_result)

        # ── Step 5: LLM Analysis ────────────────────────────────────────
        analyze_result = run_analyze_tool(profile_id)
        log_step("Analyze", analyze_result)

        # ── Step 6: Research Gap Detection ─────────────────────────────
        gap_result = run_gap_tool(profile_id)
        log_step("Gaps", gap_result)

        # ── Step 7: Escalation summary ──────────────────────────────────
        escalation_result = run_escalation_tool(profile_id)
        log_step("Escalation", escalation_result)

        # ── Step 8: Daily Digest ────────────────────────────────────────
        # Get top papers for digest
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

        # Fetch top paper titles
        top_titles = ""
        if top_paper_ids:
            papers_resp = db.table("papers").select("title").in_("id", top_paper_ids).execute()
            top_titles = "\n".join([f"- {p['title']}" for p in (papers_resp.data or [])])

        # Generate digest text
        profile_full_resp = db.table("user_profiles").select("*").eq("id", profile_id).single().execute()
        profile_data = profile_full_resp.data or {}

        digest_prompt = DAILY_DIGEST_PROMPT.format(
            interests=", ".join(profile_data.get("research_interests", [])),
            total_fetched=fetch_result.get("total_fetched", 0),
            highly_relevant=score_result.get("highly_relevant", 0),
            potentially_relevant=score_result.get("potentially_relevant", 0),
            escalated=escalation_result.get("escalation_count", 0),
            top_papers=top_titles or "No highly relevant papers found today.",
        )

        try:
            llm = ChatGroq(api_key=settings.groq_api_key, model_name="llama3-8b-8192", temperature=0.4)
            digest_response = llm.invoke([HumanMessage(content=digest_prompt)])
            digest_summary = digest_response.content.strip()
        except Exception as e:
            digest_summary = f"Daily agent run completed. {score_result.get('highly_relevant', 0)} highly relevant papers found."

        # Upsert daily digest
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

        log_step("Digest", "Generated and saved")

        # ── Mark run as completed ───────────────────────────────────────
        db.table("agent_runs").update({
            "status": "completed",
            "completed_at": "now()",
            "papers_fetched": fetch_result.get("total_fetched", 0),
            "papers_processed": score_result.get("scored", 0),
            "log": "\n".join(run_log),
        }).eq("id", run_id).execute()

        return {
            "status": "completed",
            "run_id": run_id,
            "fetch": fetch_result,
            "embed": embed_result,
            "score": score_result,
            "analyze": analyze_result,
            "gaps": gap_result,
            "escalation": escalation_result,
        }

    except Exception as e:
        logger.error(f"[Orchestrator] Fatal error: {e}")
        run_log.append(f"FATAL: {e}")
        db.table("agent_runs").update({
            "status": "failed",
            "completed_at": "now()",
            "errors": [str(e)],
            "log": "\n".join(run_log),
        }).eq("id", run_id).execute()
        raise
