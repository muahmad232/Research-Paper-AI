"""
Research Gap Detection Tool
Analyzes the corpus of relevant papers to find gaps, trends, and hot topics.
Uses upsert to prevent duplicate gaps accumulating across runs.
"""
import json
import logging
from datetime import date, timedelta
from typing import Any, Dict
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
from app.database import get_db
from app.config import settings
from app.agent.prompts import RESEARCH_GAP_PROMPT

logger = logging.getLogger(__name__)


def run_gap_tool(profile_id: str) -> Dict[str, Any]:
    """
    Analyze recent highly-relevant papers to detect research gaps and trends.
    FIX: Uses upsert on (profile_id, gap_title) to prevent duplicate gap rows.
    """
    db = get_db()

    # Load profile
    profile_resp = db.table("user_profiles").select("*").eq("id", profile_id).single().execute()
    profile = profile_resp.data or {}
    interests = profile.get("research_interests") or []

    # Get recent highly relevant papers with their titles and abstracts
    cutoff = (date.today() - timedelta(days=7)).isoformat()
    recs_resp = (
        db.table("recommendations")
        .select("paper_id, analysis")
        .eq("profile_id", profile_id)
        .eq("category", "highly_relevant")
        .gte("created_at", cutoff)
        .limit(30)
        .execute()
    )
    recs = recs_resp.data or []

    if len(recs) < 3:
        logger.info(f"[GapTool] Not enough papers for profile {profile_id} to detect gaps (need ≥3).")
        return {"gaps_created": 0, "reason": "insufficient_papers"}

    paper_ids = [r["paper_id"] for r in recs]
    themes_text = []
    for rec in recs:
        analysis = rec.get("analysis") or {}
        if analysis.get("problem"):
            themes_text.append(f"- Problem: {analysis['problem']}")
        if analysis.get("method"):
            themes_text.append(f"  Method: {analysis['method']}")

    themes = "\n".join(themes_text[:50])

    if not themes:
        # Fallback: fetch titles
        papers_resp = db.table("papers").select("title").in_("id", paper_ids).execute()
        themes = "\n".join([f"- {p['title']}" for p in (papers_resp.data or [])])

    prompt = RESEARCH_GAP_PROMPT.format(
        paper_count=len(recs),
        interests=", ".join(interests),
        themes=themes,
    )

    llm = ChatGroq(
        api_key=settings.groq_api_key,
        model_name="llama-3.1-8b-instant",
        temperature=0.3,
        max_tokens=1500,
    )

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        content = response.content.strip()

        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()

        gaps = json.loads(content)
        if not isinstance(gaps, list):
            gaps = [gaps]

        created = 0
        for gap in gaps:
            gap_title = gap.get("gap_title", "Untitled Gap")
            try:
                # FIX: Upsert by (profile_id, gap_title) — prevents duplicates across runs
                db.table("research_gaps").upsert(
                    {
                        "profile_id": profile_id,
                        "gap_title": gap_title,
                        "description": gap.get("description", ""),
                        "supporting_paper_ids": paper_ids[:5],
                        "trend_type": gap.get("trend_type", "gap"),
                    },
                    on_conflict="profile_id,gap_title",
                ).execute()
                created += 1
            except Exception as e:
                logger.error(f"[GapTool] Upsert failed for gap '{gap_title}': {e}")

        logger.info(f"[GapTool] Upserted {created} gap records for profile {profile_id}.")
        return {"gaps_created": created}

    except Exception as e:
        logger.error(f"[GapTool] Error: {e}")
        return {"gaps_created": 0, "error": str(e)}
