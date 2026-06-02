"""
Digest Router — User-scoped daily digest retrieval.
"""
from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.auth import get_current_user

router = APIRouter(prefix="/digest", tags=["digest"])


@router.get("/latest")
def get_latest_digest(current_user: dict = Depends(get_current_user)):
    """Get the most recent daily digest for the current user."""
    db = get_db()
    user_id = current_user["sub"]

    try:
        profile_resp = db.table("user_profiles").select("id").eq("user_id", user_id).execute()
        if not profile_resp.data:
            return None
        profile_id = profile_resp.data[0]["id"]

        resp = (
            db.table("daily_digests")
            .select("*")
            .eq("profile_id", profile_id)
            .order("digest_date", desc=True)
            .limit(1)
            .execute()
        )
        return resp.data[0] if resp.data else None
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
def get_digest_history(current_user: dict = Depends(get_current_user)):
    """Get historical daily digest records for the current user."""
    db = get_db()
    user_id = current_user["sub"]

    try:
        profile_resp = db.table("user_profiles").select("id").eq("user_id", user_id).execute()
        if not profile_resp.data:
            return {"digests": []}
        profile_id = profile_resp.data[0]["id"]

        resp = (
            db.table("daily_digests")
            .select("*")
            .eq("profile_id", profile_id)
            .order("digest_date", desc=True)
            .limit(30)
            .execute()
        )
        return {"digests": resp.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
