from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

from app.services.embedding_service import embed
from app.services.openai_service import answer_query
from app.services.supabase_service import search_entries_by_embedding, search_entries_by_finance


# ── Query Classifier ─────────────────────────────────────────────────────────

_FINANCE_KEYWORDS = {
    "spend", "spent", "cost", "costs", "paid", "pay", "expense", "expenses",
    "money", "amount", "total", "much", "budget", "price", "bought", "buy",
    "purchase", "charged", "bill", "invoice",
}

_TIME_PATTERNS = {
    "today":      0,
    "yesterday":  1,
    "this week":  7,
    "last week":  14,
    "this month": 30,
    "last month": 60,
    "this year":  365,
}


def _classify_query(question: str) -> Dict:
    """Local keyword classifier — no API call.

    Returns:
        {
            "is_finance": bool,       # route to SQL finance path
            "is_semantic": bool,      # route to vector search path
            "time_range_days": int,   # how many days back to look
            "similarity_threshold":   # cosine distance cutoff (lower = stricter)
        }
    """
    q = question.lower()
    words = set(q.split())

    is_finance = bool(words & _FINANCE_KEYWORDS)

    # Detect time range
    time_range_days: Optional[int] = None
    for phrase, days in _TIME_PATTERNS.items():
        if phrase in q:
            time_range_days = days
            break

    # Broad/vague queries need a relaxed threshold to cast a wider net.
    # For general "what did I do" queries we also want broad matching.
    # Cosine distance for real-world text is typically 0.4–0.8 so we
    # use 0.85 as the default and 0.95 for explicitly broad queries.
    broad_signals = {
        "anything", "everything", "all", "summary", "overview",
        "week", "month", "year", "today", "yesterday", "recent",
        "show", "list", "what",
    }
    is_broad = bool(words & broad_signals)
    similarity_threshold = 0.95 if is_broad else 0.85

    # Finance queries should also do vector search for context
    is_semantic = True  # always run vector; SQL is additive for finance

    return {
        "is_finance": is_finance,
        "is_semantic": is_semantic,
        "time_range_days": time_range_days,
        "similarity_threshold": similarity_threshold,
    }


def _build_time_window(time_range_days: Optional[int]):
    """Convert a day-count into (date_from, date_to) UTC datetimes.

    Now that entry_date is always stored as UTC in the extraction service,
    we can use clean UTC arithmetic with no timezone padding hacks.

    - ``today`` (0 days)  → UTC midnight today → UTC midnight tomorrow
    - ``yesterday`` (1)   → UTC midnight yesterday → UTC midnight today
    - ``this week`` (7)   → 7 days ago midnight → UTC midnight tomorrow
    """
    if time_range_days is None:
        return None, None

    now = datetime.now(timezone.utc)
    # End of today (midnight tomorrow) to include the full current day
    date_to = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    # Start: go back N days from today's midnight
    today_midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
    date_from = today_midnight - timedelta(days=time_range_days)
    return date_from, date_to


# ── Main Pipeline ────────────────────────────────────────────────────────────

async def query_entries(user_id: str, question: str) -> Dict:
    """Hybrid RAG pipeline: classify → SQL and/or vector → merge → GPT-4o answer.

    Returns:
        dict with keys: answer (str), sources (List[Dict]), has_data (bool)
    """
    classification = _classify_query(question)
    date_from, date_to = _build_time_window(classification["time_range_days"])

    sql_entries: List[Dict] = []
    vector_entries: List[Dict] = []

    # PATH A — SQL: fetch ALL finance entries in the time window
    # Vector search caps at match_count and misses entries — wrong for aggregation
    if classification["is_finance"]:
        sql_entries = await search_entries_by_finance(
            user_id=user_id,
            date_from=date_from,
            date_to=date_to,
        )

    # PATH B — Vector: semantic similarity search
    if classification["is_semantic"]:
        question_embedding = await embed(question)
        vector_entries = await search_entries_by_embedding(
            user_id=user_id,
            embedding=question_embedding,
            match_count=10,
            similarity_threshold=classification["similarity_threshold"],
            date_from=date_from,
            date_to=date_to,
        )

    # Merge: deduplicate by id, SQL entries take precedence (no similarity score needed)
    seen_ids = set()
    merged: List[Dict] = []

    for entry in sql_entries:
        entry_id = str(entry.get("id"))
        if entry_id not in seen_ids:
            seen_ids.add(entry_id)
            merged.append(entry)

    for entry in vector_entries:
        entry_id = str(entry.get("id"))
        if entry_id not in seen_ids:
            seen_ids.add(entry_id)
            merged.append(entry)

    if not merged:
        return {
            "answer": "I don't have enough logged data to answer that yet. Keep logging and ask me again!",
            "sources": [],
            "has_data": False,
        }

    answer = await answer_query(question, merged)

    return {
        "answer": answer,
        "sources": merged,
        "has_data": True,
    }
