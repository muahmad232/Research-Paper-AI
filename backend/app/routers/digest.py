from fastapi import APIRouter, HTTPException
from app.database import get_db

router = APIRouter(prefix="/digest", tags=["digest"])


@router.get("/latest")
def get_latest_digest():
    """Get the most recent daily digest."""
    db = get_db()
    try:
        profile_resp = db.table("user_profiles").select("id").limit(1).execute()
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
def get_digest_history():
    """Get historical daily digest records."""
    db = get_db()
    try:
        resp = (
            db.table("daily_digests")
            .select("*")
            .order("digest_date", desc=True)
            .limit(30)
            .execute()
        )
        return {"digests": resp.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
