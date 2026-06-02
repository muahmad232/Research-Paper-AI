"""
Escalations Router — User-scoped escalation queue management.
"""
from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.auth import get_current_user
from app.models.recommendation import EscalationDecision

router = APIRouter(prefix="/escalations", tags=["escalations"])


@router.get("")
def list_escalations(current_user: dict = Depends(get_current_user)):
    """Get all papers in this user's escalation queue (pending human decision)."""
    db = get_db()
    user_id = current_user["sub"]

    try:
        profile_resp = db.table("user_profiles").select("id").eq("user_id", user_id).execute()
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
def decide_escalation(
    recommendation_id: str,
    decision: EscalationDecision,
    current_user: dict = Depends(get_current_user),
):
    """Accept or reject an escalated paper. Verifies it belongs to the current user."""
    db = get_db()
    user_id = current_user["sub"]

    try:
        if decision.decision not in ("accept", "reject"):
            raise HTTPException(status_code=400, detail="decision must be 'accept' or 'reject'")

        # Ensure the recommendation belongs to this user's profile
        profile_resp = db.table("user_profiles").select("id").eq("user_id", user_id).execute()
        if not profile_resp.data:
            raise HTTPException(status_code=404, detail="Profile not found.")
        profile_id = profile_resp.data[0]["id"]

        result = (
            db.table("recommendations")
            .update({"user_decision": decision.decision})
            .eq("id", recommendation_id)
            .eq("profile_id", profile_id)
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Recommendation not found.")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
