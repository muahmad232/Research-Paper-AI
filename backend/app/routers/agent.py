from fastapi import APIRouter, HTTPException, BackgroundTasks, Header
from typing import Optional
from app.config import settings
from app.database import get_db
from app.agent.orchestrator import run_daily_agent

router = APIRouter(prefix="/agent", tags=["agent"])


@router.post("/run")
async def trigger_agent(
    background_tasks: BackgroundTasks,
    x_agent_secret: Optional[str] = Header(None),
):
    """
    Trigger the daily agent pipeline.
    Requires X-Agent-Secret header matching DAILY_AGENT_SECRET env var.
    """
    if x_agent_secret != settings.daily_agent_secret:
        raise HTTPException(status_code=401, detail="Invalid agent secret")

    background_tasks.add_task(run_daily_agent)
    return {"status": "Agent pipeline started in background"}


@router.get("/status")
def get_agent_status():
    """Get the status of the most recent agent run."""
    db = get_db()
    try:
        resp = (
            db.table("agent_runs")
            .select("id, status, started_at, completed_at, papers_fetched, papers_processed, errors")
            .order("started_at", desc=True)
            .limit(5)
            .execute()
        )
        return {"runs": resp.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
