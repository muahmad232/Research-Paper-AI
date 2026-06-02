"""
Research Gap Detection Tool
Analyzes the corpus of relevant papers to find gaps, trends, and hot topics.
"""
import json
import logging
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
    Stores gap reports in the research_gaps table.
    """
    db = get_db()

    # Load profile
    profile_resp = db.table("user_profiles").select("*").eq("id", profile_id).single().execute()
    profile = profile_resp.data or {}
    interests = profile.get("research_interests", [])

    # Get recent highly relevant papers with their titles and abstracts
    recs_resp = (
        db.table("recommendations")
        .select("paper_id, analysis")
        .eq("profile_id", profile_id)
        .eq("category", "highly_relevant")
        .gte("created_at", (__import__('datetime').date.today() - __import__('datetime').timedelta(days=7)).isoformat())
        .limit(30)
        .execute()
    )
    recs = recs_resp.data or []

    if len(recs) < 3:
        logger.info("[GapTool] Not enough papers to detect gaps (need ≥3).")
        return {"gaps_created": 0, "reason": "insufficient_papers"}

    # Gather paper IDs and themes from analysis
    paper_ids = [r["paper_id"] for r in recs]
    themes_text = []
    for rec in recs:
        analysis = rec.get("analysis") or {}
        if analysis.get("problem"):
            themes_text.append(f"- Problem: {analysis['problem']}")
        if analysis.get("method"):
            themes_text.append(f"  Method: {analysis['method']}")

    themes = "\n".join(themes_text[:50])  # Limit tokens

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
        model_name="llama3-8b-8192",
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
            db.table("research_gaps").insert({
                "profile_id": profile_id,
                "gap_title": gap.get("gap_title", "Untitled Gap"),
                "description": gap.get("description", ""),
                "supporting_paper_ids": paper_ids[:5],
                "trend_type": gap.get("trend_type", "gap"),
            }).execute()
            created += 1

        logger.info(f"[GapTool] Created {created} gap records.")
        return {"gaps_created": created}

    except Exception as e:
        logger.error(f"[GapTool] Error: {e}")
        return {"gaps_created": 0, "error": str(e)}
