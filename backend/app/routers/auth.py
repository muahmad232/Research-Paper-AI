"""
Auth Router — Register, Login, Me
Simple DB-backed auth with bcrypt passwords and JWT tokens.
"""
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr
from app.database import get_db
from app.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Request / Response Models ──────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: str
    name: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    token: str
    user: dict


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/register", response_model=AuthResponse)
def register(body: RegisterRequest):
    """
    Create a new user account.
    Instantly returns a JWT token — no email verification required.
    """
    db = get_db()

    # Validate inputs
    if not body.email or not body.name or not body.password:
        raise HTTPException(status_code=400, detail="All fields are required.")
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    # Check if email already exists
    existing = db.table("users").select("id").eq("email", body.email.lower()).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    # Create user
    try:
        result = db.table("users").insert({
            "email": body.email.lower().strip(),
            "name": body.name.strip(),
            "password_hash": hash_password(body.password),
        }).execute()

        user = result.data[0]

        # Create a default empty profile for the user
        db.table("user_profiles").insert({
            "user_id": user["id"],
            "research_interests": [],
            "keywords": [],
            "preferred_domains": [],
            "preferred_venues": [],
            "excluded_topics": [],
        }).execute()

        token = create_access_token(user["id"], user["email"], user["name"])
        return {
            "token": token,
            "user": {"id": user["id"], "email": user["email"], "name": user["name"]},
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest):
    """Authenticate with email + password. Returns a JWT token."""
    db = get_db()

    if not body.email or not body.password:
        raise HTTPException(status_code=400, detail="Email and password are required.")

    # Look up user
    result = db.table("users").select("id, email, name, password_hash").eq("email", body.email.lower()).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    user = result.data[0]

    # Verify password
    if not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token(user["id"], user["email"], user["name"])
    return {
        "token": token,
        "user": {"id": user["id"], "email": user["email"], "name": user["name"]},
    }


@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    """Return the currently authenticated user's info."""
    db = get_db()
    user_id = current_user["sub"]

    result = db.table("users").select("id, email, name, created_at").eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found.")
    return result.data[0]
