from fastapi import APIRouter, HTTPException
from app.database import get_db
from app.models.recommendation import EscalationDecision

router = APIRouter(prefix="/escalations", tags=["escalations"])


@router.get("")
def list_escalations():
    """Get all papers in the escalation queue (pending human decision)."""
    db = get_db()
    try:
        profile_resp = db.table("user_profiles").select("id").limit(1).execute()
        if not profile_resp.data:
            return {"escalations": [], "total": 0}
        profile_id = profile_resp.data[0]["id"]

        resp = (
            db.table("recommendations")
            .select(
                "id, paper_id, final_score, semantic_score, keyword_score, recency_score, "
                "explanation, category, created_at, "
                "papers(id, title, abstract, authors, categories, published_at, url, source)"
            )
            .eq("profile_id", profile_id)
            .eq("escalated", True)
            .is_("user_decision", "null")
            .order("final_score", desc=True)
            .execute()
        )
        data = resp.data or []
        return {"escalations": data, "total": len(data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{recommendation_id}/decide")
def decide_escalation(recommendation_id: str, decision: EscalationDecision):
    """Accept or reject an escalated paper."""
    db = get_db()
    try:
        if decision.decision not in ("accept", "reject"):
            raise HTTPException(status_code=400, detail="decision must be 'accept' or 'reject'")

        result = (
            db.table("recommendations")
            .update({"user_decision": decision.decision})
            .eq("id", recommendation_id)
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Recommendation not found")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
