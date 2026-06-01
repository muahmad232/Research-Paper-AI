"""
Paper Fetch Tool — fetches from arXiv + Semantic Scholar and upserts to DB
"""
import logging
from typing import Any, Dict, List
from app.database import get_db
from app.services.arxiv_service import fetch_arxiv_papers
from app.services.semantic_scholar_service import fetch_semantic_scholar_papers

logger = logging.getLogger(__name__)


def run_fetch_tool(
    query_terms: List[str],
    categories: List[str],
    max_papers: int = 100,
    days_back: int = 1,
) -> Dict[str, Any]:
    """
    Fetch papers from arXiv and Semantic Scholar, upsert to DB.
    Returns summary of what was fetched.
    """
    db = get_db()

    # Fetch from both sources
    arxiv_papers = fetch_arxiv_papers(query_terms, categories, max_papers // 2, days_back)
    ss_papers = fetch_semantic_scholar_papers(query_terms, max_papers // 2, days_back)

    all_papers = arxiv_papers + ss_papers
    inserted = 0
    skipped = 0

    for paper in all_papers:
        try:
            # Upsert — skip if external_id already exists
            db.table("papers").upsert(
                {k: v for k, v in paper.items() if v is not None},
                on_conflict="external_id",
                ignore_duplicates=True,
            ).execute()
            inserted += 1
        except Exception as e:
            logger.warning(f"[FetchTool] Upsert failed for {paper.get('external_id')}: {e}")
            skipped += 1

    logger.info(f"[FetchTool] Inserted {inserted}, skipped {skipped}")
    return {
        "total_fetched": len(all_papers),
        "arxiv_count": len(arxiv_papers),
        "semantic_scholar_count": len(ss_papers),
        "inserted": inserted,
        "skipped": skipped,
    }
