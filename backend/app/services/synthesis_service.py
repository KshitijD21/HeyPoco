"""
synthesis_service.py
--------------------
Takes the user's question + retrieval results and produces a natural language
answer via one GPT-4o call.

Rules:
- Finance totals are pre-computed in Python — GPT-4o uses the number as fact.
- List queries skip synthesis entirely (handled in query_service).
- Empty results return a canned message (no GPT-4o call).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from openai import AsyncOpenAI

from app.config import get_settings
from app.services.query_classifier import QueryClassification
from app.services.retrieval_service import RetrievalResult

logger = logging.getLogger(__name__)

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=get_settings().openai_api_key)
    return _client


# ── Output shape ────────────────────────────────────────────────────────────


@dataclass
class SynthesisResult:
    answer: str
    confidence: str  # "high" | "medium" | "low"
    used_fallback: bool


# ── Entry formatter ─────────────────────────────────────────────────────────


SYSTEM_PROMPT = """\
You are a personal memory assistant for a voice-first life logging app.
The user speaks their life — expenses, journal entries, tasks, events, health notes.
You answer questions about their logged data.

Rules:
- Only use information from the entries provided. Never fabricate.
- If finance_total is provided, use that exact number. Do not recompute.
- Similarity scores: strong match (<0.3) = directly relevant. related (0.3–0.6) = mention with qualifier.
- If fallback_triggered, acknowledge it: "I couldn't find X specifically, but here's what I found."
- Be concise. No preamble. Answer the question directly.
- If entries are empty, say "Nothing in your logs matches that yet." Do not apologize excessively.
- Use the user's exact words back to them where possible (merchant names, people names, etc.)
"""


def _format_entry(entry: dict) -> str:
    """Format a single entry for the GPT-4o context window."""
    date_str = entry.get("entry_date") or entry.get("created_at") or "unknown date"
    if date_str and "T" in str(date_str):
        date_str = str(date_str)[:16]

    # Strip null and empty fields
    raw_fields = entry.get("extracted_fields") or {}
    clean_fields = {
        k: v
        for k, v in raw_fields.items()
        if v is not None and v != [] and v != {} and v != ""
    }
    fields_str = ", ".join(f"{k}={v}" for k, v in clean_fields.items())

    similarity = entry.get("similarity")
    confidence_note = ""
    if similarity is not None:
        if similarity < 0.3:
            confidence_note = " [strong match]"
        elif similarity < 0.6:
            confidence_note = " [related]"

    entry_type = entry.get("type", "general").upper()
    logged = entry.get("raw_text", "")

    parts = [f"[{entry_type} — {date_str}{confidence_note}]", f"Logged: {logged}"]
    if fields_str:
        parts.append(f"Fields: {fields_str}")
    return "\n".join(parts)


# ── Main synthesis function ─────────────────────────────────────────────────


async def synthesize(
    question: str,
    retrieval: RetrievalResult,
    classification: QueryClassification,
) -> SynthesisResult:
    """Produce a natural language answer from retrieval results.

    Skips GPT-4o for list queries (caller handles that).
    Returns a canned message if no entries.
    """
    if not retrieval.entries:
        return SynthesisResult(
            answer="Nothing in your logs matches that yet.",
            confidence="low",
            used_fallback=False,
        )

    # Build context
    context_lines = [_format_entry(e) for e in retrieval.entries]
    context = "\n\n".join(context_lines)

    finance_line = ""
    if retrieval.finance_total is not None:
        finance_line = (
            f"\nPre-computed total: ${retrieval.finance_total:.2f} "
            f"— use this exact number.\n"
        )

    fallback_line = ""
    if retrieval.fallback_triggered and retrieval.fallback_reason:
        fallback_line = f"\nNote: {retrieval.fallback_reason}\n"

    user_message = (
        f"Question: {question}\n"
        f"{finance_line}{fallback_line}\n"
        f"Entries:\n{context}\n"
    )

    # Call GPT-4o
    client = _get_client()
    settings = get_settings()

    try:
        response = await client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.2,
        )

        answer = response.choices[0].message.content
        answer = answer.strip() if answer else "I couldn't generate an answer."
    except Exception as exc:
        logger.error("Synthesis GPT-4o call failed: %s", exc)
        answer = "Something went wrong generating the answer. Please try again."
        return SynthesisResult(
            answer=answer,
            confidence="low",
            used_fallback=retrieval.fallback_triggered,
        )

    # Determine confidence
    if retrieval.fallback_triggered:
        confidence = "medium"
    elif retrieval.vector_count > 0:
        # Check average similarity of vector results
        similarities = [
            e.get("similarity", 1.0)
            for e in retrieval.entries
            if e.get("similarity") is not None
        ]
        if similarities:
            avg = sum(similarities) / len(similarities)
            confidence = "high" if avg < 0.3 else "medium"
        else:
            confidence = "high"  # SQL-only results
    else:
        confidence = "high"  # SQL-only results

    return SynthesisResult(
        answer=answer,
        confidence=confidence,
        used_fallback=retrieval.fallback_triggered,
    )
