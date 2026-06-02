"""
Embedding Tool — generates and stores embeddings for papers without them.
Uses bulk upsert instead of per-row updates to minimize DB round-trips.
"""
import logging
from typing import Any, Dict
from app.database import get_db
from app.services.embedding_service import embed_texts

logger = logging.getLogger(__name__)
BATCH_SIZE = 32       # How many papers to embed in a single SentenceTransformers call
DB_CHUNK_SIZE = 50    # How many embedding upserts to send in a single Supabase call


def run_embed_tool() -> Dict[str, Any]:
    """
    Find papers in DB without embeddings and generate them.
    Stores embedding vectors back to DB via bulk upsert.
    """
    db = get_db()

    # Fetch papers without embeddings (limit to 200 — newly fetched papers only)
    response = (
        db.table("papers")
        .select("id, title, abstract")
        .is_("embedding", "null")
        .limit(200)
        .execute()
    )
    papers = response.data or []

    if not papers:
        logger.info("[EmbedTool] No papers without embeddings.")
        return {"processed": 0}

    processed = 0
    updates = []  # Collect all {id, embedding} pairs before writing

    for i in range(0, len(papers), BATCH_SIZE):
        batch = papers[i : i + BATCH_SIZE]
        texts = [f"{p['title']}. {p.get('abstract', '')}" for p in batch]

        try:
            embeddings = embed_texts(texts)
            for paper, emb in zip(batch, embeddings):
                updates.append({"id": paper["id"], "embedding": emb})
            processed += len(batch)
            logger.info(f"[EmbedTool] Embedded batch {i // BATCH_SIZE + 1}: {len(batch)} papers")
        except Exception as e:
            logger.error(f"[EmbedTool] Embedding batch error: {e}")

    # Bulk upsert all embeddings in chunks — dramatically fewer Supabase round-trips
    if updates:
        for j in range(0, len(updates), DB_CHUNK_SIZE):
            chunk = updates[j : j + DB_CHUNK_SIZE]
            try:
                db.table("papers").upsert(chunk, on_conflict="id").execute()
                logger.info(f"[EmbedTool] DB upsert chunk {j // DB_CHUNK_SIZE + 1}: {len(chunk)} rows")
            except Exception as e:
                logger.error(f"[EmbedTool] DB upsert chunk failed: {e}")

    return {"processed": processed}
