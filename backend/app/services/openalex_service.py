"""
OpenAlex Paper Fetching Service
Fetches recent papers from the OpenAlex API (https://api.openalex.org/works)
"""
import httpx
import logging
import time
from datetime import date, timedelta
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

OPENALEX_BASE_URL = "https://api.openalex.org/works"

def fetch_openalex_papers(
    query_terms: List[str],
    max_results: int = 100,
    days_back: int = 1,
) -> List[Dict[str, Any]]:
    """
    Fetch papers from OpenAlex matching query terms.
    Free tier allows 100k requests/day.
    """
    papers = []
    seen_ids = set()
    cutoff = date.today() - timedelta(days=days_back)
    
    # We join all query terms using OR to make a single broad search, or we can search term by term
    # OpenAlex search: `default.search:term1|term2`
    
    # Let's search term by term to match how we did it before, up to 5 terms
    with httpx.Client(timeout=30) as client:
        for term in query_terms[:5]:
            try:
                # Calculate per-term limit
                limit_per_term = max(10, min(max_results // len(query_terms[:5]), 50))
                
                response = client.get(
                    OPENALEX_BASE_URL,
                    params={
                        "filter": f"default.search:{term},from_publication_date:{cutoff.isoformat()},has_abstract:true",
                        "per-page": limit_per_term,
                        "mailto": "research.agent@example.com", # Join polite pool
                    },
                )
                response.raise_for_status()
                data = response.json()
                
                for work in data.get("results", []):
                    oa_id = work.get("id")
                    if not oa_id or oa_id in seen_ids:
                        continue
                    seen_ids.add(oa_id)
                    
                    # Extract authors
                    authorships = work.get("authorships", [])
                    authors = [a.get("author", {}).get("display_name", "") for a in authorships if a.get("author")]
                    
                    # Extract concepts/categories
                    concepts = work.get("concepts", [])
                    categories = [c.get("display_name") for c in concepts if c.get("display_name")]
                    
                    # Extract abstract (OpenAlex returns abstract as an inverted index, or sometimes plain text if we use the right field, wait:
                    # OpenAlex abstract is inverted index. We have to reconstruct it, or just use the title if abstract is hard.
                    # Wait, let's see if there is a helper for abstract reconstruction.
                    # Yes, OpenAlex abstract_inverted_index looks like {"word": [positions]}
                    abstract = ""
                    inv_index = work.get("abstract_inverted_index")
                    if inv_index:
                        # Reconstruct abstract
                        words_with_pos = []
                        for word, positions in inv_index.items():
                            for pos in positions:
                                words_with_pos.append((pos, word))
                        words_with_pos.sort()
                        abstract = " ".join([word for pos, word in words_with_pos])
                    
                    if not abstract:
                        continue
                        
                    papers.append({
                        "external_id": f"oa:{oa_id.split('/')[-1]}", # e.g. oa:W2741809807
                        "source": "openalex",
                        "title": work.get("title", "").strip(),
                        "abstract": abstract.strip(),
                        "authors": authors,
                        "categories": categories,
                        "published_at": work.get("publication_date", cutoff.isoformat()),
                        "url": work.get("doi") or oa_id,
                    })

                time.sleep(0.1) # Polite delay
                
            except httpx.HTTPStatusError as e:
                logger.error(f"[OpenAlex] HTTP error for term '{term}': {e.response.status_code}")
                time.sleep(2)
            except Exception as e:
                logger.error(f"[OpenAlex] Error for term '{term}': {e}")

    logger.info(f"[OpenAlex] Fetched {len(papers)} papers")
    return papers
