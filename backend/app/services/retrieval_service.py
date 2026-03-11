"""
retrieval_service.py
--------------------
Executes the correct retrieval path(s) based on QueryClassification.
Returns merged, deduplicated entries with similarity scores attached.

Four retrieval paths:
    PATH A — Finance SQL (all entries with amount in time window)
    PATH B — Vector search (semantic similarity via match_entries RPC)
    PATH C — Person SQL (entries mentioning a specific person)
    PATH D — Type+Date SQL (direct list queries, no synthesis needed)
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Optional

from app.services.embedding_service import embed
from app.services.query_classifier import QueryClassification
from app.services.supabase_service import get_supabase_client, search_entries_by_embedding

logger = logging.getLogger(__name__)


# ── Output shape ────────────────────────────────────────────────────────────


@dataclass
class RetrievalResult:
    entries: list[dict] = field(default_factory=list)
    sql_count: int = 0
    vector_count: int = 0
    finance_total: Optional[float] = None
    fallback_triggered: bool = False
    fallback_reason: Optional[str] = None


# ── SQL query helpers ───────────────────────────────────────────────────────


async def _finance_sql(
    user_id: str,
    date_from: Optional[str],
    date_to: Optional[str],
) -> list[dict]:
    """PATH A — Fetch ALL entries with an extracted amount in the time window."""
    client = await get_supabase_client()

    query = (
        client.table("entries")
        .select("id, type, raw_text, extracted_fields, tags, entry_date")
        .eq("user_id", user_id)
        .eq("is_sensitive", False)
        .not_.is_("extracted_fields->>amount", "null")
    )

    if date_from:
        query = query.gte("entry_date", date_from)
    if date_to:
        query = query.lt("entry_date", date_to)

    query = query.order("entry_date", desc=True)
    result = await query.execute()
    return result.data or []


async def _person_sql(
    user_id: str,
    person_name: str,
    date_from: Optional[str],
) -> list[dict]:
    """PATH C — Fetch entries mentioning a specific person.

    Checks extracted_fields->>'person', the 'people' array, and raw_text.
    Uses three separate queries merged together since Supabase client
    doesn't support complex OR + JSON operators in a single filter chain.
    """
    client = await get_supabase_client()
    seen_ids: set[str] = set()
    results: list[dict] = []

    # Query 1: extracted_fields->>'person' ILIKE person_name
    q1 = (
        client.table("entries")
        .select("id, type, raw_text, extracted_fields, tags, entry_date")
        .eq("user_id", user_id)
        .eq("is_sensitive", False)
        .ilike("extracted_fields->>person", f"%{person_name}%")
        .order("entry_date", desc=True)
        .limit(20)
    )
    if date_from:
        q1 = q1.gte("entry_date", date_from)
    r1 = await q1.execute()
    for e in r1.data or []:
        if e["id"] not in seen_ids:
            seen_ids.add(e["id"])
            results.append(e)

    # Query 2: raw_text ILIKE %person_name%
    q2 = (
        client.table("entries")
        .select("id, type, raw_text, extracted_fields, tags, entry_date")
        .eq("user_id", user_id)
        .eq("is_sensitive", False)
        .ilike("raw_text", f"%{person_name}%")
        .order("entry_date", desc=True)
        .limit(20)
    )
    if date_from:
        q2 = q2.gte("entry_date", date_from)
    r2 = await q2.execute()
    for e in r2.data or []:
        if e["id"] not in seen_ids:
            seen_ids.add(e["id"])
            results.append(e)

    return results


async def _type_date_sql(
    user_id: str,
    type_filter: Optional[str],
    date_from: Optional[str],
    date_to: Optional[str],
) -> list[dict]:
    """PATH D — Direct list query: type + date filter, no vector search."""
    client = await get_supabase_client()

    query = (
        client.table("entries")
        .select("id, type, raw_text, extracted_fields, tags, entry_date")
        .eq("user_id", user_id)
        .eq("is_sensitive", False)
    )

    if type_filter:
        query = query.eq("type", type_filter)
    if date_from:
        query = query.gte("entry_date", date_from)
    if date_to:
        query = query.lt("entry_date", date_to)

    query = query.order("entry_date", desc=True).limit(30)
    result = await query.execute()
    return result.data or []


# ── Merge + deduplication ───────────────────────────────────────────────────


def _merge_results(sql_entries: list[dict], vector_entries: list[dict]) -> list[dict]:
    """Merge SQL and vector results, deduplicated by id.

    SQL entries go in first (no similarity score).
    Vector entries annotate existing entries with similarity, or add new ones.
    """
    seen: dict[str, dict] = {}

    for e in sql_entries:
        eid = str(e.get("id"))
        seen[eid] = e

    for e in vector_entries:
        eid = str(e.get("id"))
        if eid in seen:
            seen[eid]["similarity"] = e.get("similarity")
        else:
            seen[eid] = e

    return list(seen.values())


# ── Finance total computation ───────────────────────────────────────────────


def _compute_finance_total(entries: list[dict]) -> float:
    """Sum all amounts from extracted_fields. Computed in Python, not GPT-4o."""
    total = 0.0
    for e in entries:
        fields = e.get("extracted_fields") or {}
        amount = fields.get("amount")
        if amount is not None:
            try:
                total += float(amount)
            except (ValueError, TypeError):
                pass
    return total


# ── Main retrieval function ─────────────────────────────────────────────────


async def retrieve(
    classification: QueryClassification,
    question: str,
    user_id: str,
) -> RetrievalResult:
    """Execute the correct retrieval path(s) and return merged results.

    Path routing:
        is_list_query=True              → PATH D only
        is_finance=True                 → PATH A + PATH B
        is_person=True                  → PATH C + PATH B
        else                            → PATH B only (pure semantic)
    """
    date_from_iso = classification.date_from.isoformat() if classification.date_from else None
    date_to_iso = classification.date_to.isoformat() if classification.date_to else None

    sql_entries: list[dict] = []
    vector_entries: list[dict] = []
    finance_total: Optional[float] = None
    fallback_triggered = False
    fallback_reason: Optional[str] = None

    # ── PATH D — List query (return directly, no vector, no synthesis) ──
    if classification.is_list_query:
        sql_entries = await _type_date_sql(
            user_id=user_id,
            type_filter=classification.type_filter,
            date_from=date_from_iso,
            date_to=date_to_iso,
        )
        return RetrievalResult(
            entries=sql_entries,
            sql_count=len(sql_entries),
            vector_count=0,
            finance_total=None,
            fallback_triggered=False,
            fallback_reason=None,
        )

    # ── PATH A — Finance SQL ────────────────────────────────────────────
    if classification.is_finance:
        sql_entries = await _finance_sql(
            user_id=user_id,
            date_from=date_from_iso,
            date_to=date_to_iso,
        )

        # If a specific merchant was mentioned, filter to only that merchant
        if classification.merchant_filter:
            merchant_lower = classification.merchant_filter.lower()
            sql_entries = [
                e for e in sql_entries
                if merchant_lower in (e.get("extracted_fields") or {}).get("merchant", "").lower()
                or merchant_lower in (e.get("raw_text") or "").lower()
            ]

        finance_total = _compute_finance_total(sql_entries)

    # ── PATH C — Person SQL ─────────────────────────────────────────────
    if classification.is_person and classification.person_name:
        person_entries = await _person_sql(
            user_id=user_id,
            person_name=classification.person_name,
            date_from=date_from_iso,
        )
        sql_entries = _merge_results(sql_entries, person_entries)

    # ── PATH B — Vector search (always runs unless list query) ──────────
    try:
        question_embedding = await embed(question)
        vector_entries = await search_entries_by_embedding(
            user_id=user_id,
            embedding=question_embedding,
            match_count=15,
            similarity_threshold=classification.similarity_threshold,
            type_filter=classification.type_filter if not classification.is_finance else None,
            date_from=classification.date_from,
            date_to=classification.date_to,
        )
    except Exception as exc:
        logger.warning("Vector search failed (non-fatal): %s", exc)
        vector_entries = []

    # ── Merge ───────────────────────────────────────────────────────────
    merged = _merge_results(sql_entries, vector_entries)

    # ── Fallback logic ──────────────────────────────────────────────────

    # Finance fallback: if vector found nothing specific but we have SQL data
    if classification.is_finance and not vector_entries and sql_entries:
        fallback_triggered = True
        fallback_reason = (
            f"No entries specifically matching your query. "
            f"Showing all spending for the period."
        )

    # Semantic fallback: vector returned nothing
    if not merged and not classification.is_finance:
        if classification.date_from or classification.date_to:
            # Fall back to type+date SQL with no type filter
            fallback_entries = await _type_date_sql(
                user_id=user_id,
                type_filter=None,
                date_from=date_from_iso,
                date_to=date_to_iso,
            )
            if fallback_entries:
                merged = fallback_entries
                fallback_triggered = True
                fallback_reason = "No strong semantic matches. Showing recent entries for the period."

    return RetrievalResult(
        entries=merged,
        sql_count=len(sql_entries),
        vector_count=len(vector_entries),
        finance_total=finance_total,
        fallback_triggered=fallback_triggered,
        fallback_reason=fallback_reason,
    )
