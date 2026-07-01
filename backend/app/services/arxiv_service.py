"""
arXiv Paper Fetching Service
Fetches recent papers matching user topics from arXiv API.

Strategy: one search per query term (instead of a single OR-merged query).
This produces tighter, more specific result sets that avoid the noise of
broad OR-combined category searches.
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
    days_back: int = 7,
) -> List[Dict[str, Any]]:
    """
    Fetch papers from arXiv published within the last `days_back` days.

    Runs ONE search per query term (+ category filter) rather than a single
    OR-merged query, which prevents unrelated papers from slipping through.
    Results are deduplicated by arXiv ID.

    Returns list of paper dicts ready for DB insertion.
    """
    seen_ids: set = set()
    all_papers: List[Dict[str, Any]] = []

    cutoff = date.today() - timedelta(days=days_back)
    cat_query = " OR ".join(f"cat:{c}" for c in categories)

    # Per-term budget: split max_results evenly, minimum 10 per term
    per_term_limit = max(10, max_results // max(1, len(query_terms)))

    client = arxiv.Client(page_size=50, delay_seconds=1, num_retries=2)

    for term in query_terms:
        # Exact-phrase search within abstracts + category filter
        full_query = f'abs:"{term}" AND ({cat_query})'
        logger.info(f"[arXiv] Searching: {full_query[:120]}")

        try:
            search = arxiv.Search(
                query=full_query,
                max_results=per_term_limit,
                sort_by=arxiv.SortCriterion.SubmittedDate,
                sort_order=arxiv.SortOrder.Descending,
            )

            for result in client.results(search):
                pub_date = result.published.date()
                if pub_date < cutoff:
                    continue  # arXiv results aren't perfectly date-sorted; continue not break

                arxiv_id = result.entry_id.split("/")[-1]
                if arxiv_id in seen_ids:
                    continue
                seen_ids.add(arxiv_id)

                all_papers.append({
                    "external_id":  f"arxiv:{arxiv_id}",
                    "source":       "arxiv",
                    "title":        result.title.strip(),
                    "abstract":     result.summary.strip(),
                    "authors":      [a.name for a in result.authors],
                    "categories":   result.categories,
                    "published_at": pub_date.isoformat(),
                    "url":          result.entry_id,
                })

        except Exception as e:
            logger.error(f"[arXiv] Fetch error for term '{term}': {e}")

    logger.info(f"[arXiv] Fetched {len(all_papers)} unique papers across {len(query_terms)} terms")
    return all_papers
