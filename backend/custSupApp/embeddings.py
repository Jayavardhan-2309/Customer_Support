"""
embeddings.py — drop-in replacement for the HuggingFace API embed_text function.

Uses fastembed (https://github.com/qdrant/fastembed) which:
  - Downloads the model once (~22 MB) on first use and caches it in /tmp
  - Runs entirely in-process — no API key, no external HTTP calls
  - Uses the same sentence-transformers/all-MiniLM-L6-v2 model you had before
  - Is free forever

Install: pip install fastembed

On Render: the model is downloaded on first request and cached for the lifetime
of the instance. Cold starts will be ~5–10s slower on the very first request only.
"""

from fastembed import TextEmbedding

_model = None


def _get_model():
    global _model
    if _model is None:
        # Downloads ~22 MB on first call, then cached in ~/.cache/fastembed
        _model = TextEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")
    return _model


def embed_text(text: str) -> list[float]:
    """
    Returns a 384-dimensional embedding vector for the given text.
    Drop-in replacement for the old HuggingFace API version.
    """
    model = _get_model()
    # fastembed returns a generator of numpy arrays
    embeddings = list(model.embed([text]))
    return embeddings[0].tolist()