from fastapi import APIRouter, HTTPException
from app.database import get_db
from app.models.profile import UserProfileCreate, UserProfileUpdate

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("")
def get_profile():
    """Get the current user profile."""
    db = get_db()
    resp = db.table("user_profiles").select("*").limit(1).execute()
    if not resp.data:
        return None
    return resp.data[0]


@router.post("")
def create_profile(profile: UserProfileCreate):
    """Create a new user profile. Replaces any existing profile."""
    db = get_db()
    try:
        # Delete old profile
        existing = db.table("user_profiles").select("id").limit(1).execute()
        if existing.data:
            db.table("user_profiles").delete().eq("id", existing.data[0]["id"]).execute()

        result = db.table("user_profiles").insert(profile.model_dump()).execute()
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("")
def update_profile(profile: UserProfileUpdate):
    """Update the existing user profile."""
    db = get_db()
    try:
        existing = db.table("user_profiles").select("id").limit(1).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="No profile found. Create one first.")

        profile_id = existing.data[0]["id"]
        result = (
            db.table("user_profiles")
            .update(profile.model_dump(exclude_unset=True))
            .eq("id", profile_id)
            .execute()
        )
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
