"""
Research Gaps Router — User-scoped gap reporting.
"""
from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.auth import get_current_user

router = APIRouter(prefix="/gaps", tags=["gaps"])


@router.get("")
def list_gaps(current_user: dict = Depends(get_current_user)):
    """Get all research gap reports for the current user."""
    db = get_db()
    user_id = current_user["sub"]

    try:
        profile_resp = db.table("user_profiles").select("id").eq("user_id", user_id).execute()
        if not profile_resp.data:
            return {"gaps": [], "total": 0}
        profile_id = profile_resp.data[0]["id"]

        resp = (
            db.table("research_gaps")
            .select("*")
            .eq("profile_id", profile_id)
            .order("created_at", desc=True)
            .limit(50)
            .execute()
        )
        data = resp.data or []
        return {"gaps": data, "total": len(data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
