"""
Paper Analysis Tool — uses Groq LLM to extract structured insights from abstracts.
Only analyzes highly_relevant papers that have not yet been analyzed.
"""
import json
import logging
from typing import Any, Dict
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
from app.database import get_db
from app.config import settings
from app.agent.prompts import PAPER_ANALYSIS_PROMPT

logger = logging.getLogger(__name__)


def _get_llm():
    return ChatGroq(
        api_key=settings.groq_api_key,
        model_name="openai/gpt-oss-20b",
        temperature=0.1,
        max_tokens=1024,
    )


def run_analyze_tool(profile_id: str) -> Dict[str, Any]:
    """
    Run LLM analysis on all 'highly_relevant' papers that haven't been analyzed yet.
    FIX: Filters at DB level for null analysis, not empty dict (which is always truthy).
    """
    db = get_db()
    llm = _get_llm()

    # FIX: Filter at DB level — analysis IS NULL means not yet analyzed.
    # The schema was changed so analysis defaults to NULL instead of '{}'.
    recs_resp = (
        db.table("recommendations")
        .select("id, paper_id, analysis")
        .eq("profile_id", profile_id)
        .eq("category", "highly_relevant")
        .is_("analysis", "null")
        .execute()
    )
    recs = recs_resp.data or []

    if not recs:
        logger.info(f"[AnalyzeTool] No papers to analyze for profile {profile_id}.")
        return {"analyzed": 0}

    analyzed = 0
    errors = 0

    for rec in recs[:20]:  # Cap at 20 per run to manage API costs
        paper_resp = (
            db.table("papers")
            .select("title, abstract")
            .eq("id", rec["paper_id"])
            .single()
            .execute()
        )
        paper = paper_resp.data
        if not paper or not paper.get("abstract"):
            continue

        prompt = PAPER_ANALYSIS_PROMPT.format(
            title=paper["title"],
            abstract=paper["abstract"][:3000],
        )

        try:
            response = llm.invoke([HumanMessage(content=prompt)])
            content = response.content.strip()

            # Parse JSON from response
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()

            analysis = json.loads(content)

            db.table("recommendations").update({"analysis": analysis}).eq("id", rec["id"]).execute()
            analyzed += 1
            logger.info(f"[AnalyzeTool] Analyzed recommendation {rec['id']}")

        except json.JSONDecodeError as e:
            logger.error(f"[AnalyzeTool] JSON parse error for rec {rec['id']}: {e}")
            errors += 1
        except Exception as e:
            logger.error(f"[AnalyzeTool] LLM error for rec {rec['id']}: {e}")
            errors += 1

    return {"analyzed": analyzed, "errors": errors}
