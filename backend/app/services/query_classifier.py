"""
query_classifier.py
-------------------
Local keyword-based query classifier. Zero API calls. Runs in < 1ms.

Takes the user's raw question and returns a QueryClassification that drives
all routing decisions in the retrieval pipeline.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional
from zoneinfo import ZoneInfo


# ── Output shape ────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class QueryClassification:
    # Routing flags
    is_finance: bool
    is_person: bool
    is_list_query: bool
    needs_synthesis: bool  # True for aggregation + semantic, False for list queries

    # Time window — calendar-aware, in user's timezone → converted to UTC
    time_range_label: str  # today | yesterday | this_week | last_week | this_month | last_month | all_time
    date_from: Optional[datetime]  # UTC datetime, start of window
    date_to: Optional[datetime]  # UTC datetime, end of window (exclusive)

    # Entity extraction
    person_name: Optional[str]
    type_filter: Optional[str]  # journal | task | event | finance | health | note | None
    merchant_filter: Optional[str]  # extracted merchant name for finance queries (e.g. "Chipotle")

    # Vector search tuning
    similarity_threshold: float  # 0.5 for specific, 0.6 for broad


# ── Keyword sets ────────────────────────────────────────────────────────────

_FINANCE_KEYWORDS = {
    "spend", "spent", "cost", "costs", "paid", "pay", "expense", "expenses",
    "money", "amount", "total", "budget", "price", "bought", "purchase",
    "charged", "bill", "fee", "transaction",
}

_FINANCE_PHRASES = [
    "how much", "what did i pay", "what did i spend",
]

_LIST_PATTERNS = [
    "show me", "list", "all my", "what are my", "display",
]

_TYPE_MAP = {
    # journal
    "journals": "journal", "journal entries": "journal", "journal": "journal",
    "diary": "journal",
    # task
    "tasks": "task", "open tasks": "task", "to do": "task", "todos": "task",
    "to-do": "task",
    # event
    "events": "event", "appointments": "event", "meetings": "event",
    "calendar": "event",
    # health
    "health logs": "health", "health": "health", "symptoms": "health",
    "medication": "health", "medications": "health",
    # note
    "notes": "note", "my notes": "note",
    # finance
    "expenses": "finance", "spending": "finance", "transactions": "finance",
}

# Finance merchant extraction patterns — "at X", "on X", "for X", "from X"
# Only captures capitalised word(s) — stops at lowercase words like "this", "last"
_MERCHANT_PATTERNS = [
    r"(?:spend|spent|pay|paid|cost|bought|purchase[d]?)\b.*?\bat\s+([A-Z][\w&''\-]+(?:\s+[A-Z][\w&''\-]+)*)",
    r"\bat\s+([A-Z][\w&''\-]+(?:\s+[A-Z][\w&''\-]+)*)",
    r"\bon\s+([A-Z][\w&''\-]+(?:\s+[A-Z][\w&''\-]+)*)",
    r"\bfrom\s+([A-Z][\w&''\-]+(?:\s+[A-Z][\w&''\-]+)*)",
    r"\bfor\s+([A-Z][\w&''\-]+(?:\s+[A-Z][\w&''\-]+)*)",
]

# Words that are NOT merchants (to avoid false positives)
_NON_MERCHANT_WORDS = {
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    "january", "february", "march", "april", "may", "june", "july", "august",
    "september", "october", "november", "december",
    "today", "yesterday", "tomorrow", "morning", "evening", "afternoon", "night",
    "week", "month", "year", "shopping", "food", "transport", "entertainment",
    "the", "this", "that", "what", "how", "much",
}

_TIME_PHRASES = [
    ("today", "today"),
    ("yesterday", "yesterday"),
    ("this week", "this_week"),
    ("last week", "last_week"),
    ("this month", "this_month"),
    ("last month", "last_month"),
]

# Person extraction patterns
_PERSON_PATTERNS = [
    r"what (?:has|did|does|is|about) (\w+)",
    r"(?:tell me about|anything about|update on|updates on) (\w+)",
    r"(\w+) and (?:i|me)",
    r"(?:with|from|to|for) (\w+)",
]

_STOP_WORDS = {
    "i", "me", "my", "we", "you", "he", "she", "it", "they", "them",
    "the", "a", "an", "this", "that", "these", "those", "is", "are",
    "was", "were", "be", "been", "have", "has", "had", "do", "did",
    "does", "will", "would", "could", "should", "can", "may", "might",
    "shall", "must", "what", "when", "where", "who", "how", "why",
    "which", "all", "any", "some", "much", "many", "most", "other",
    "about", "up", "out", "on", "off", "over", "under", "again",
    "there", "here", "if", "or", "and", "but", "not", "no", "so",
    "too", "very", "just", "also", "now", "then", "than", "more",
    "still", "already", "today", "yesterday", "week", "month",
    "last", "next", "everything", "anything", "something", "nothing",
    "been", "going", "doing", "feel", "felt", "feeling", "think",
    "show", "list", "display", "give", "tell", "open", "recent",
}


# ── Time window builder ────────────────────────────────────────────────────


def _build_time_window(
    label: str, user_tz: ZoneInfo
) -> tuple[Optional[datetime], Optional[datetime]]:
    """Convert a time_range_label into (date_from, date_to) in UTC.

    All boundaries are calendar-aware in the user's local timezone,
    then converted to UTC for the database query.
    """
    if label == "all_time":
        return None, None

    now_local = datetime.now(user_tz)
    today_local = now_local.replace(hour=0, minute=0, second=0, microsecond=0)

    if label == "today":
        start = today_local
        end = today_local + timedelta(days=1)

    elif label == "yesterday":
        start = today_local - timedelta(days=1)
        end = today_local

    elif label == "this_week":
        # Monday of the current week
        days_since_monday = today_local.weekday()  # Mon=0
        start = today_local - timedelta(days=days_since_monday)
        end = today_local + timedelta(days=1)  # include today fully

    elif label == "last_week":
        days_since_monday = today_local.weekday()
        this_monday = today_local - timedelta(days=days_since_monday)
        start = this_monday - timedelta(weeks=1)
        end = this_monday

    elif label == "this_month":
        start = today_local.replace(day=1)
        end = today_local + timedelta(days=1)

    elif label == "last_month":
        first_of_this_month = today_local.replace(day=1)
        last_month_end = first_of_this_month
        # First day of previous month
        if first_of_this_month.month == 1:
            start = first_of_this_month.replace(year=first_of_this_month.year - 1, month=12)
        else:
            start = first_of_this_month.replace(month=first_of_this_month.month - 1)
        end = last_month_end

    else:
        return None, None

    # Convert to UTC
    from_utc = start.astimezone(ZoneInfo("UTC"))
    to_utc = end.astimezone(ZoneInfo("UTC"))
    return from_utc, to_utc


# ── Merchant extractor ─────────────────────────────────────────────────────


def _extract_merchant(question: str) -> Optional[str]:
    """Try to extract a merchant/store name from a finance question.

    Looks for capitalised words after prepositions like "at", "on", "from".
    Returns None if no merchant is confidently detected.
    """
    for pattern in _MERCHANT_PATTERNS:
        match = re.search(pattern, question)
        if match:
            candidate = match.group(1).strip().rstrip("?.,!")
            # Skip time words and generic terms
            if candidate.lower() in _NON_MERCHANT_WORDS:
                continue
            if len(candidate) < 2:
                continue
            return candidate

    # Fallback: look for capitalised words not at sentence start that aren't
    # common time/finance words
    words = question.split()
    for i, word in enumerate(words):
        clean = re.sub(r"[^\w&''\-]", "", word)
        if (
            i > 0
            and clean
            and clean[0].isupper()
            and clean.lower() not in _STOP_WORDS
            and clean.lower() not in _NON_MERCHANT_WORDS
            and clean.lower() not in _FINANCE_KEYWORDS
            and len(clean) > 1
            and not clean.isupper()
        ):
            return clean

    return None


# ── Person name extractor ──────────────────────────────────────────────────


def _extract_person_name(question: str) -> Optional[str]:
    """Try to extract a person's name from the question.

    Uses regex patterns and capitalization heuristics. Returns None if
    no person name is confidently detected.
    """
    q_lower = question.lower()

    # Pattern-based extraction
    for pattern in _PERSON_PATTERNS:
        match = re.search(pattern, q_lower)
        if match:
            candidate = match.group(1)
            if candidate not in _STOP_WORDS and len(candidate) > 1:
                # Return with original capitalisation from the question
                # Find the candidate in the original question
                idx = q_lower.index(candidate)
                original = question[idx : idx + len(candidate)]
                return original.capitalize()

    # Capitalisation heuristic: look for capitalised words not at sentence start
    words = question.split()
    for i, word in enumerate(words):
        clean = re.sub(r"[^\w]", "", word)
        if (
            i > 0
            and clean
            and clean[0].isupper()
            and clean.lower() not in _STOP_WORDS
            and len(clean) > 1
            and not clean.isupper()  # skip ALL-CAPS words like "SSN"
        ):
            return clean

    return None


# ── Main classifier ─────────────────────────────────────────────────────────


def classify_query(question: str, user_timezone: str = "UTC") -> QueryClassification:
    """Classify a user question into routing flags + time window + filters.

    Pure local logic. Zero API calls. Returns a frozen dataclass.
    """
    try:
        user_tz = ZoneInfo(user_timezone)
    except (KeyError, Exception):
        user_tz = ZoneInfo("UTC")

    q_lower = question.lower()
    words = set(q_lower.split())

    # ── Finance detection ───────────────────────────────────────────────
    is_finance = bool(words & _FINANCE_KEYWORDS) or any(
        p in q_lower for p in _FINANCE_PHRASES
    )

    # ── Type filter detection ───────────────────────────────────────────
    type_filter: Optional[str] = None
    for phrase, entry_type in sorted(_TYPE_MAP.items(), key=lambda x: -len(x[0])):
        if phrase in q_lower:
            type_filter = entry_type
            break

    # If finance detected via keywords, set type_filter if not already set
    if is_finance and type_filter is None:
        type_filter = "finance"

    # ── List query detection ────────────────────────────────────────────
    is_list_query = any(p in q_lower for p in _LIST_PATTERNS) and type_filter is not None

    # ── Merchant detection (finance queries only) ────────────────────
    merchant_filter: Optional[str] = None
    if is_finance:
        merchant_filter = _extract_merchant(question)

    # ── Person detection ────────────────────────────────────────────────
    person_name = _extract_person_name(question)
    is_person = person_name is not None

    # ── Time window detection ───────────────────────────────────────────
    time_range_label = "all_time"
    for phrase, label in _TIME_PHRASES:
        if phrase in q_lower:
            time_range_label = label
            break

    date_from, date_to = _build_time_window(time_range_label, user_tz)

    # ── Synthesis decision ──────────────────────────────────────────────
    needs_synthesis = not is_list_query

    # ── Similarity threshold ────────────────────────────────────────────
    is_specific = is_person or type_filter is not None or is_finance
    similarity_threshold = 0.5 if is_specific else 0.6

    return QueryClassification(
        is_finance=is_finance,
        is_person=is_person,
        is_list_query=is_list_query,
        needs_synthesis=needs_synthesis,
        time_range_label=time_range_label,
        date_from=date_from,
        date_to=date_to,
        person_name=person_name,
        type_filter=type_filter,
        merchant_filter=merchant_filter,
        similarity_threshold=similarity_threshold,
    )
