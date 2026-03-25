"""
embeddings.py — uses Google Gemini text-embedding-004 for vector embeddings.

Free tier: 1,500 requests/day, no credit card needed.
Model: text-embedding-004 — 768-dimensional vectors.
API key: set CUSTOMER_API in your .env / Render env vars.

NOTE: Your pgvector column must be vector(768).
If you were previously using all-MiniLM-L6-v2 (384-dim), run this in Supabase:
    ALTER TABLE kb_chunks ALTER COLUMN embedding TYPE vector(768) USING NULL;
    Then re-trigger indexing for each org.
"""

import os
import requests

GEMINI_EMBED_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "text-embedding-004:embedContent"
)


def embed_text(text: str) -> list[float]:
    """
    Returns a 768-dimensional embedding vector using Gemini text-embedding-004.
    Raises on API error so the caller (index_knowledge, ai.py) can handle it.
    """
    api_key = os.environ.get("CUSTOMER_API")
    if not api_key:
        raise RuntimeError("CUSTOMER_API environment variable is not set")

    response = requests.post(
        GEMINI_EMBED_URL,
        headers={"Content-Type": "application/json"},
        params={"key": api_key},
        json={
            "model": "models/text-embedding-004",
            "content": {"parts": [{"text": text}]},
        },
        timeout=10,
    )

    if response.status_code != 200:
        raise RuntimeError(
            f"Gemini embedding API error {response.status_code}: {response.text}"
        )

    return response.json()["embedding"]["values"]