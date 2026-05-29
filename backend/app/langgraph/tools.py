import os
import json
from typing import Literal
from langchain_core.tools import tool
from langchain_openai import OpenAIEmbeddings
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Filter,
    FieldCondition,
    MatchValue,
    MatchExcept,
    Range,
    MatchText,
)

EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
EMBEDDING_BASE_URL = os.getenv("OPENAI_EMBEDDING_BASE_URL", "https://api.openai.com/v1")
EMBEDDING_API_KEY = os.getenv("OPENAI_EMBEDDING_API_KEY")
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", None)

_embeddings = None
_qdrant = None


def _get_embeddings():
    global _embeddings
    if _embeddings is None:
        _embeddings = OpenAIEmbeddings(
            model=EMBEDDING_MODEL,
            base_url=EMBEDDING_BASE_URL,
            api_key=EMBEDDING_API_KEY,
            dimensions=512,
        )
    return _embeddings


def _get_qdrant():
    global _qdrant
    if _qdrant is None:
        _qdrant = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
    return _qdrant


def _build_qdrant_filter(filters: dict) -> Filter | None:
    if not filters:
        return None
    conditions = []
    for key, value in filters.items():
        if isinstance(value, dict):
            op = list(value.keys())[0]
            val = value[op]
            if op in ("$gt", "$gte", "$lt", "$lte"):
                conditions.append(
                    FieldCondition(
                        key=key,
                        range=Range(
                            gt=val if op == "$gt" else None,
                            gte=val if op == "$gte" else None,
                            lt=val if op == "$lt" else None,
                            lte=val if op == "$lte" else None,
                        ),
                    )
                )
            elif op == "$ne":
                conditions.append(
                    FieldCondition(key=key, match=MatchExcept(**{key: val}))
                )
            elif op == "$like":
                conditions.append(
                    FieldCondition(key=key, match=MatchText(text=val))
                )
            elif op == "$eq":
                conditions.append(
                    FieldCondition(key=key, match=MatchValue(value=val))
                )
        else:
            conditions.append(
                FieldCondition(key=key, match=MatchValue(value=value))
            )
    return Filter(must=conditions) if conditions else None


@tool
def qdrant_search(
    collection_name: Literal["documents"],
    query: str,
    top_k: int = 5,
    filters: str | None = None,
):
    """Search document chunks in a Qdrant collection by semantic similarity.

    Available collection: "documents" — contains text chunks from indexed files.
    Each chunk has the following payload fields available for filtering:

      - doc_type (str): File type — "pdf", "docx", "xlsx", "txt", "md", "csv"
      - source_path (str): Relative path to the source file (e.g. "reports/2024/report.pdf")
      - chunk_index (int): Sequential chunk number within the file (0, 1, 2, ...)
      - created_at (str): File creation date in ISO format (e.g. "2024-01-15T10:30:00")
      - modified_at (str): File last-modified date in ISO format

    Filter operators (pass as JSON string in the `filters` parameter):
      - Exact match:          {"doc_type": "pdf"}
      - Not equal:            {"doc_type": {"$ne": "xlsx"}}
      - Greater than:         {"chunk_index": {"$gt": 0}}
      - Greater or equal:     {"chunk_index": {"$gte": 5}}
      - Less than:            {"chunk_index": {"$lt": 10}}
      - Less or equal:        {"modified_at": {"$lte": "2024-06-01T00:00:00"}}
      - Text / partial match: {"source_path": {"$like": "report"}}
      - Combined example:     {"doc_type": "pdf", "chunk_index": {"$gte": 0}}

    Args:
        collection_name: Must be "documents".
        query: Natural language query for semantic similarity search.
        top_k: Number of top results to return (default 5, max 50).
        filters: Optional JSON string of payload field filters (see operators above).
    """
    emb = _get_embeddings()
    client = _get_qdrant()

    query_vector = emb.embed_query(query)

    parsed_filters = None
    if filters:
        try:
            parsed_filters = _build_qdrant_filter(json.loads(filters))
        except (json.JSONDecodeError, TypeError):
            pass

    search_result = client.search(
        collection_name=collection_name,
        query_vector=query_vector,
        limit=min(top_k, 50),
        query_filter=parsed_filters,
        with_payload=True,
    )

    if not search_result:
        return "Ничего не найдено."

    lines = []
    for i, hit in enumerate(search_result, 1):
        payload = hit.payload or {}
        content = payload.get("content", "")
        source = payload.get("source_path", "неизвестно")
        doc_type = payload.get("doc_type", "неизвестно")
        modified = payload.get("modified_at", "")
        score = hit.score if hit.score is not None else 0.0

        content_preview = content[:500] + "..." if len(content) > 500 else content

        lines.append(
            f"[{i}] Источник: {source}\n"
            f"    Тип: {doc_type}\n"
            f"    Дата изменения: {modified}\n"
            f"    Релевантность: {score:.3f}\n"
            f"    Содержимое: {content_preview}\n"
        )

    return "\n".join(lines)


tools = [qdrant_search]
