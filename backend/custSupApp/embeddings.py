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
from google import genai
from google.genai import types

def embed_text(text: str) -> list[float]:
    api_key = os.environ.get("CUSTOMER_API")
    if not api_key:
        raise RuntimeError("CUSTOMER_API environment variable is not set")

    client = genai.Client(api_key=api_key)

    result = client.models.embed_content(
        model="gemini-embedding-001",
        contents=text,
        config=types.EmbedContentConfig(output_dimensionality=768)
    )

    return result.embeddings[0].values
