import logging

import requests
from django.db import connection

from knowledge_base.embeddings import embed_text

logger = logging.getLogger(__name__)


def search_similar_chunks(query: str, org_id: int | None, k: int = 2) -> list[str]:
    try:
        query_vector = embed_text(query)
    except (RuntimeError, ValueError, requests.RequestException) as exc:
        logger.info("[EMBED ERROR QUERY] %s", exc)
        return []

    with connection.cursor() as cursor:
        query_vector_str = "[" + ",".join(map(str, query_vector)) + "]"
        cursor.execute(
            """
            SELECT content
            FROM kb_chunks
            WHERE org_id = %s
            ORDER BY embedding <-> %s::vector
            LIMIT %s
            """,
            [org_id, query_vector_str, k],
        )
        return [row[0] for row in cursor.fetchall()]
