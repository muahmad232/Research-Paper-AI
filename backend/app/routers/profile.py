"""
Profile Router — User-scoped profile management.
One profile per user, looked up by user_id from JWT.
"""
from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.auth import get_current_user
from app.models.profile import UserProfileCreate, UserProfileUpdate

router = APIRouter(prefix="/profile", tags=["profile"])


def _get_profile_id(db, user_id: str) -> str | None:
    """Helper: get the profile id for the current user, or None."""
    resp = db.table("user_profiles").select("id").eq("user_id", user_id).execute()
    return resp.data[0]["id"] if resp.data else None


@router.get("")
def get_profile(current_user: dict = Depends(get_current_user)):
    """Get the current user's research profile."""
    db = get_db()
    user_id = current_user["sub"]
    resp = db.table("user_profiles").select("*").eq("user_id", user_id).execute()
    return resp.data[0] if resp.data else None


@router.put("")
def upsert_profile(
    profile: UserProfileUpdate,
    current_user: dict = Depends(get_current_user),
):
    """
    Create or update the current user's research profile.
    Safe upsert — only updates fields that are provided.
    """
    db = get_db()
    user_id = current_user["sub"]

    try:
        existing_resp = db.table("user_profiles").select("id").eq("user_id", user_id).execute()

        update_data = profile.model_dump(exclude_unset=True, exclude_none=True)

        if existing_resp.data:
            profile_id = existing_resp.data[0]["id"]
            result = (
                db.table("user_profiles")
                .update(update_data)
                .eq("id", profile_id)
                .execute()
            )
            return result.data[0]
        else:
            # Create new profile for this user
            result = db.table("user_profiles").insert({
                "user_id": user_id,
                **update_data,
            }).execute()
            return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
