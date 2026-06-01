"""
Embedding Service — wraps sentence-transformers all-MiniLM-L6-v2
Singleton model instance to avoid reloading on every request.
"""
import logging
from typing import List
import numpy as np

logger = logging.getLogger(__name__)

_model = None


def get_model():
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info("[Embeddings] Loading all-MiniLM-L6-v2...")
            _model = SentenceTransformer("all-MiniLM-L6-v2")
            logger.info("[Embeddings] Model loaded.")
        except Exception as e:
            logger.error(f"[Embeddings] Failed to load model: {e}")
            raise
    return _model


def embed_texts(texts: List[str]) -> List[List[float]]:
    """Generate embeddings for a list of texts. Returns list of float vectors."""
    model = get_model()
    embeddings = model.encode(texts, batch_size=32, show_progress_bar=False, normalize_embeddings=True)
    return [emb.tolist() for emb in embeddings]


def embed_single(text: str) -> List[float]:
    """Generate embedding for a single text string."""
    return embed_texts([text])[0]


def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """Compute cosine similarity between two normalized vectors."""
    a = np.array(vec_a)
    b = np.array(vec_b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))
