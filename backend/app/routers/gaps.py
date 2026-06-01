from fastapi import APIRouter, HTTPException
from app.database import get_db

router = APIRouter(prefix="/gaps", tags=["gaps"])


@router.get("")
def list_gaps():
    """Get all research gap reports."""
    db = get_db()
    try:
        resp = (
            db.table("research_gaps")
            .select("*")
            .order("created_at", desc=True)
            .limit(50)
            .execute()
        )
        return {"gaps": resp.data or [], "total": len(resp.data or [])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
