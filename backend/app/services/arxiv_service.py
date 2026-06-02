"""
arXiv Paper Fetching Service
Fetches recent papers matching user topics from arXiv API
"""
import arxiv
import logging
from datetime import date, timedelta
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


def fetch_arxiv_papers(
    query_terms: List[str],
    categories: List[str],
    max_results: int = 100,
    days_back: int = 1,
) -> List[Dict[str, Any]]:
    """
    Fetch papers from arXiv published within the last `days_back` days.
    Returns list of paper dicts ready for DB insertion.
    """
    papers = []
    seen_ids = set()

    # Build query: combine terms with OR, restrict to categories
    term_query = " OR ".join(f'abs:"{t}"' for t in query_terms)
    cat_query = " OR ".join(f"cat:{c}" for c in categories)
    full_query = f"({term_query}) AND ({cat_query})"

    logger.info(f"[arXiv] Query: {full_query[:120]}...")

    try:
        client = arxiv.Client(page_size=50, delay_seconds=3, num_retries=3)
        search = arxiv.Search(
            query=full_query,
            max_results=max_results,
            sort_by=arxiv.SortCriterion.SubmittedDate,
            sort_order=arxiv.SortOrder.Descending,
        )

        cutoff = date.today() - timedelta(days=days_back)

        for result in client.results(search):
            pub_date = result.published.date()
            if pub_date < cutoff:
                continue  # FIX: was `break` — arXiv results aren't always perfectly date-sorted

            arxiv_id = result.entry_id.split("/")[-1]
            if arxiv_id in seen_ids:
                continue
            seen_ids.add(arxiv_id)

            papers.append({
                "external_id": f"arxiv:{arxiv_id}",
                "source": "arxiv",
                "title": result.title.strip(),
                "abstract": result.summary.strip(),
                "authors": [a.name for a in result.authors],
                "categories": result.categories,
                "published_at": pub_date.isoformat(),
                "url": result.entry_id,
            })

        logger.info(f"[arXiv] Fetched {len(papers)} papers")
    except Exception as e:
        logger.error(f"[arXiv] Fetch error: {e}")

    return papers
