"""
Escalation Tool — Manages the escalation queue logic.
Papers in uncertain score range (50-70) or with conflicting signals are escalated.
The scoring tool already marks papers as escalated; this tool generates a summary.
"""
import logging
from typing import Any, Dict
from app.database import get_db

logger = logging.getLogger(__name__)


def run_escalation_tool(profile_id: str) -> Dict[str, Any]:
    """
    Summarize the current escalation queue.
    Returns count and list of escalated paper IDs needing human review.
    """
    db = get_db()

    resp = (
        db.table("recommendations")
        .select("id, paper_id, final_score, semantic_score, keyword_score, explanation")
        .eq("profile_id", profile_id)
        .eq("escalated", True)
        .is_("user_decision", "null")
        .execute()
    )
    escalated = resp.data or []

    logger.info(f"[EscalationTool] {len(escalated)} papers in escalation queue")
    return {
        "escalation_count": len(escalated),
        "escalated_ids": [e["paper_id"] for e in escalated],
    }
