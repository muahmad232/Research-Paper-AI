"""
Papers Router — User-scoped paper listing.
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional
import json
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
from app.database import get_db
from app.auth import get_current_user
from app.config import settings
from app.agent.prompts import PAPER_ANALYSIS_PROMPT

router = APIRouter(prefix="/papers", tags=["papers"])


@router.get("")
def list_papers(
    category: Optional[str] = Query(None, description="Filter by category: highly_relevant, potentially_relevant"),
    source: Optional[str] = Query(None, description="Filter by source: arxiv, semantic_scholar"),
    limit: int = Query(20, le=100),
    offset: int = Query(0),
    current_user: dict = Depends(get_current_user),
):
    """List papers with optional filters. Joins with recommendations for score data."""
    db = get_db()
    user_id = current_user["sub"]

    try:
        # Get this user's profile
        profile_resp = db.table("user_profiles").select("id").eq("user_id", user_id).execute()
        if not profile_resp.data:
            return {"papers": [], "total": 0, "has_profile": False}
        profile_id = profile_resp.data[0]["id"]

        query = (
            db.table("recommendations")
            .select(
                "id, paper_id, final_score, category, explanation, analysis, escalated, user_decision, created_at, "
                "papers(id, external_id, source, title, abstract, authors, categories, published_at, url)"
            )
            .eq("profile_id", profile_id)
        )

        if category and category != "all":
            query = query.eq("category", category)

        result = query.order("final_score", desc=True).range(offset, offset + limit - 1).execute()

        papers = result.data or []

        # Apply source filter in Python (PostgREST can't filter on joined table columns)
        if source and papers:
            papers = [r for r in papers if (r.get("papers") or {}).get("source") == source]

        # Get true total count for pagination
        count_query = (
            db.table("recommendations")
            .select("id", count="exact")
            .eq("profile_id", profile_id)
        )
        if category and category != "all":
            count_query = count_query.eq("category", category)
        count_resp = count_query.execute()
        total = count_resp.count if hasattr(count_resp, 'count') and count_resp.count is not None else len(papers)

        return {"papers": papers, "total": total, "has_profile": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{paper_id}")
def get_paper(
    paper_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get full paper details including LLM analysis and explainability."""
    db = get_db()
    user_id = current_user["sub"]

    try:
        paper_resp = db.table("papers").select("*").eq("id", paper_id).single().execute()
        if not paper_resp.data:
            raise HTTPException(status_code=404, detail="Paper not found")

        # Get recommendation scoped to this user's profile
        profile_resp = db.table("user_profiles").select("id").eq("user_id", user_id).execute()
        rec = None
        if profile_resp.data:
            profile_id = profile_resp.data[0]["id"]
            rec_resp = (
                db.table("recommendations")
                .select("*")
                .eq("paper_id", paper_id)
                .eq("profile_id", profile_id)
                .limit(1)
                .execute()
            )
            rec = rec_resp.data[0] if rec_resp.data else None

        return {"paper": paper_resp.data, "recommendation": rec}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{paper_id}/analyze")
def analyze_paper_manual(
    paper_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Manually trigger AI analysis for a single paper."""
    db = get_db()
    user_id = current_user["sub"]

    try:
        # Verify user has profile and get recommendation ID
        profile_resp = db.table("user_profiles").select("id").eq("user_id", user_id).execute()
        if not profile_resp.data:
            raise HTTPException(status_code=400, detail="Profile not found")
        profile_id = profile_resp.data[0]["id"]

        rec_resp = (
            db.table("recommendations")
            .select("id, analysis")
            .eq("paper_id", paper_id)
            .eq("profile_id", profile_id)
            .single()
            .execute()
        )
        rec = rec_resp.data
        if not rec:
            raise HTTPException(status_code=404, detail="Paper not found in your recommendations")
        if rec.get("analysis"):
            return {"status": "already_analyzed", "analysis": rec["analysis"]}

        # Get paper details
        paper_resp = db.table("papers").select("title, abstract").eq("id", paper_id).single().execute()
        paper = paper_resp.data
        if not paper or not paper.get("abstract"):
            raise HTTPException(status_code=400, detail="Paper lacks an abstract for analysis")

        # Run LLM
        prompt = PAPER_ANALYSIS_PROMPT.format(title=paper["title"], abstract=paper["abstract"][:3000])
        llm = ChatGroq(api_key=settings.groq_api_key, model_name="llama-3.1-8b-instant", temperature=0.1)
        response = llm.invoke([HumanMessage(content=prompt)])
        content = response.content.strip()

        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()

        analysis = json.loads(content)
        db.table("recommendations").update({"analysis": analysis}).eq("id", rec["id"]).execute()

        return {"status": "success", "analysis": analysis}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
