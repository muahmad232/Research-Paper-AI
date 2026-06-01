"""
Embedding Tool — generates and stores embeddings for papers without them
"""
import logging
from typing import Any, Dict
from app.database import get_db
from app.services.embedding_service import embed_texts

logger = logging.getLogger(__name__)
BATCH_SIZE = 32


def run_embed_tool() -> Dict[str, Any]:
    """
    Find papers in DB without embeddings and generate them.
    Stores embedding vectors back to DB.
    """
    db = get_db()

    # Fetch papers without embeddings
    response = (
        db.table("papers")
        .select("id, title, abstract")
        .is_("embedding", "null")
        .limit(500)
        .execute()
    )
    papers = response.data or []

    if not papers:
        logger.info("[EmbedTool] No papers without embeddings.")
        return {"processed": 0}

    processed = 0
    for i in range(0, len(papers), BATCH_SIZE):
        batch = papers[i : i + BATCH_SIZE]
        texts = [f"{p['title']}. {p.get('abstract', '')}" for p in batch]

        try:
            embeddings = embed_texts(texts)
            for paper, emb in zip(batch, embeddings):
                db.table("papers").update({"embedding": emb}).eq("id", paper["id"]).execute()
            processed += len(batch)
            logger.info(f"[EmbedTool] Embedded batch {i // BATCH_SIZE + 1}: {len(batch)} papers")
        except Exception as e:
            logger.error(f"[EmbedTool] Batch error: {e}")

    return {"processed": processed}
