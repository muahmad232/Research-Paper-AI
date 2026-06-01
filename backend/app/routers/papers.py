from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from app.database import get_db

router = APIRouter(prefix="/papers", tags=["papers"])


@router.get("")
def list_papers(
    category: Optional[str] = Query(None, description="Filter by category: highly_relevant, potentially_relevant"),
    source: Optional[str] = Query(None, description="Filter by source: arxiv, semantic_scholar"),
    limit: int = Query(20, le=100),
    offset: int = Query(0),
):
    """List papers with optional filters. Joins with recommendations for score data."""
    db = get_db()
    try:
        # Get profile
        profile_resp = db.table("user_profiles").select("id").limit(1).execute()
        if not profile_resp.data:
            return {"papers": [], "total": 0}
        profile_id = profile_resp.data[0]["id"]

        query = (
            db.table("recommendations")
            .select(
                "id, paper_id, final_score, category, explanation, analysis, escalated, user_decision, created_at, "
                "papers(id, external_id, source, title, abstract, authors, categories, published_at, url)"
            )
            .eq("profile_id", profile_id)
            .neq("category", "not_relevant")
        )

        if category:
            query = query.eq("category", category)

        if source:
            query = query.eq("papers.source", source)

        result = query.order("final_score", desc=True).range(offset, offset + limit - 1).execute()

        return {"papers": result.data or [], "total": len(result.data or [])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{paper_id}")
def get_paper(paper_id: str):
    """Get full paper details including LLM analysis and explainability."""
    db = get_db()
    try:
        paper_resp = db.table("papers").select("*").eq("id", paper_id).single().execute()
        if not paper_resp.data:
            raise HTTPException(status_code=404, detail="Paper not found")

        rec_resp = (
            db.table("recommendations")
            .select("*")
            .eq("paper_id", paper_id)
            .limit(1)
            .execute()
        )
        rec = rec_resp.data[0] if rec_resp.data else None

        return {"paper": paper_resp.data, "recommendation": rec}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
