"""
Semantic Scholar Paper Fetching Service
Fetches recent papers from the Semantic Scholar API
"""
import httpx
import logging
import time
from datetime import date, timedelta
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

SS_BASE_URL = "https://api.semanticscholar.org/graph/v1"
SS_FIELDS = "title,abstract,authors,year,publicationDate,fieldsOfStudy,externalIds,url"


def fetch_semantic_scholar_papers(
    query_terms: List[str],
    max_results: int = 100,
    days_back: int = 1,
) -> List[Dict[str, Any]]:
    """
    Fetch papers from Semantic Scholar matching query terms.
    Rate limit: 1 req/sec on free tier.
    """
    papers = []
    seen_ids = set()
    cutoff = date.today() - timedelta(days=days_back)

    with httpx.Client(timeout=30) as client:
        for term in query_terms[:5]:  # Limit queries to avoid rate limits
            try:
                response = client.get(
                    f"{SS_BASE_URL}/paper/search",
                    params={
                        "query": term,
                        "limit": min(max_results // len(query_terms[:5]), 50),
                        "fields": SS_FIELDS,
                        "publicationDateOrYear": f"{cutoff.isoformat()}:",
                    },
                )
                response.raise_for_status()
                data = response.json()

                for paper in data.get("data", []):
                    ss_id = paper.get("paperId")
                    if not ss_id or ss_id in seen_ids:
                        continue
                    seen_ids.add(ss_id)

                    pub_date_str = paper.get("publicationDate")
                    if not pub_date_str:
                        continue

                    pub_date = date.fromisoformat(pub_date_str[:10])
                    if pub_date < cutoff:
                        continue

                    authors = [a.get("name", "") for a in paper.get("authors", [])]
                    fields = paper.get("fieldsOfStudy") or []

                    papers.append({
                        "external_id": f"ss:{ss_id}",
                        "source": "semantic_scholar",
                        "title": paper.get("title", "").strip(),
                        "abstract": (paper.get("abstract") or "").strip(),
                        "authors": authors,
                        "categories": fields,
                        "published_at": pub_date.isoformat(),
                        "url": paper.get("url") or f"https://www.semanticscholar.org/paper/{ss_id}",
                    })

                time.sleep(1.1)  # Respect 1 req/sec rate limit

            except httpx.HTTPStatusError as e:
                logger.error(f"[SS] HTTP error for term '{term}': {e.response.status_code}")
                time.sleep(2)
            except Exception as e:
                logger.error(f"[SS] Error for term '{term}': {e}")

    logger.info(f"[SemanticScholar] Fetched {len(papers)} papers")
    return papers
