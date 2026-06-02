"""
Paper Fetch Tool — fetches from arXiv + Semantic Scholar and upserts to DB.
Papers are shared across all users (deduped by external_id).
"""
import logging
import concurrent.futures
from typing import Any, Dict, List
from app.database import get_db
from app.services.arxiv_service import fetch_arxiv_papers
from app.services.openalex_service import fetch_openalex_papers

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

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        future_arxiv = executor.submit(fetch_arxiv_papers, query_terms, categories, max_papers // 2, days_back)
        future_oa = executor.submit(fetch_openalex_papers, query_terms, max_papers // 2, days_back)
        arxiv_papers = future_arxiv.result()
        oa_papers = future_oa.result()

    all_papers = arxiv_papers + oa_papers
    inserted = 0

    if all_papers:
        cleaned_papers = [{k: v for k, v in p.items() if v is not None} for p in all_papers]
        
        # Batch upsert in chunks to ensure reliability
        chunk_size = 100
        for i in range(0, len(cleaned_papers), chunk_size):
            chunk = cleaned_papers[i : i + chunk_size]
            try:
                result = db.table("papers").upsert(
                    chunk,
                    on_conflict="external_id",
                    ignore_duplicates=True,
                ).execute()
                
                # When ignore_duplicates=True, Supabase returns the rows that were actually inserted
                if result.data:
                    inserted += len(result.data)
            except Exception as e:
                logger.error(f"[FetchTool] Bulk upsert failed: {e}")
                
    skipped = len(all_papers) - inserted

    logger.info(f"[FetchTool] Inserted {inserted} new, skipped {skipped} duplicates")
    return {
        "total_fetched": len(all_papers),
        "arxiv_count": len(arxiv_papers),
        "openalex_count": len(oa_papers),
        "inserted": inserted,
        "skipped": skipped,
    }
