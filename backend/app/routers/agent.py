"""
Agent Router

POST /agent/run       — JWT auth required. Runs pipeline for the calling user's profile ONLY.
POST /agent/run-all   — Agent secret header required. Runs pipeline for ALL profiles (GitHub Actions).
GET  /agent/status    — JWT auth required. Returns recent run history.
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks, Header, Depends
from typing import Optional
from app.config import settings
from app.database import get_db
from app.auth import get_current_user
from app.agent.orchestrator import run_agent_for_user, run_daily_agent

router = APIRouter(prefix="/agent", tags=["agent"])


@router.post("/run")
async def trigger_agent_for_me(
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    """
    Trigger the agent pipeline for the authenticated user's profile ONLY.
    Fast — processes a single profile instead of all users.
    """
    user_id = current_user["sub"]
    background_tasks.add_task(run_agent_for_user, user_id)
    return {"status": "Agent pipeline started for your profile"}


@router.post("/run-all")
async def trigger_agent_all(
    background_tasks: BackgroundTasks,
    x_agent_secret: Optional[str] = Header(None),
):
    """
    Trigger the agent pipeline for ALL user profiles.
    Secured by X-Agent-Secret header — called by GitHub Actions at 7 AM UTC.
    """
    if not x_agent_secret or x_agent_secret != settings.daily_agent_secret:
        raise HTTPException(status_code=403, detail="Invalid or missing agent secret.")
    background_tasks.add_task(run_daily_agent)
    return {"status": "Agent pipeline started for all profiles"}


@router.get("/status")
def get_agent_status(current_user: dict = Depends(get_current_user)):
    """Get the status of the most recent agent runs (last 5)."""
    db = get_db()
    try:
        resp = (
            db.table("agent_runs")
            .select("id, status, started_at, completed_at, papers_fetched, papers_processed, errors, log")
            .order("started_at", desc=True)
            .limit(5)
            .execute()
        )
        return {"runs": resp.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
