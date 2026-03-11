"""
query_service.py
----------------
Top-level orchestrator for the retrieval pipeline.

Pipeline: classify → retrieve → synthesize (or return directly for list queries).

This module wires together:
    - query_classifier.py  (local keyword classification)
    - retrieval_service.py (SQL + vector hybrid retrieval)
    - synthesis_service.py (GPT-4o answer generation)
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Optional

from app.services.query_classifier import classify_query
from app.services.retrieval_service import retrieve
from app.services.synthesis_service import synthesize

logger = logging.getLogger(__name__)


# ── Output shape ────────────────────────────────────────────────────────────


@dataclass
class PipelineStep:
    id: str
    label: str
    status: str  # "done" | "skipped"
    detail: Optional[str] = None
    duration_ms: Optional[int] = None


@dataclass
class QueryResponse:
    answer: str
    sources: list[dict] = field(default_factory=list)
    has_data: bool = False
    fallback_triggered: bool = False
    finance_total: Optional[float] = None
    confidence: str = "low"
    pipeline_steps: list[PipelineStep] = field(default_factory=list)


# ── Main pipeline ───────────────────────────────────────────────────────────


async def query_entries(
    user_id: str,
    question: str,
    user_timezone: str = "UTC",
) -> QueryResponse:
    """Full retrieval pipeline: classify → retrieve → synthesize.

    Args:
        user_id: UUID of the authenticated user.
        question: Natural language question.
        user_timezone: IANA timezone string (e.g. "Asia/Kolkata").

    Returns:
        QueryResponse with answer, sources, metadata.
    """
    steps: list[PipelineStep] = []

    # Step 1 — Classify
    t0 = time.perf_counter()
    classification = classify_query(question, user_timezone)
    classify_ms = int((time.perf_counter() - t0) * 1000)

    route_parts = []
    if classification.is_finance:
        route_parts.append("finance-sql")
        if classification.merchant_filter:
            route_parts.append(f"merchant={classification.merchant_filter}")
    if classification.is_person:
        route_parts.append(f"person={classification.person_name}")
    if classification.is_list_query:
        route_parts.append("list-query")
    route_parts.append(f"time={classification.time_range_label}")
    if classification.type_filter:
        route_parts.append(f"type={classification.type_filter}")

    steps.append(PipelineStep(
        id="classify",
        label="Query Classification",
        status="done",
        detail=", ".join(route_parts),
        duration_ms=classify_ms,
    ))

    logger.info(
        "Query classified: finance=%s, person=%s, list=%s, time=%s, type=%s, merchant=%s",
        classification.is_finance,
        classification.is_person,
        classification.is_list_query,
        classification.time_range_label,
        classification.type_filter,
        classification.merchant_filter,
    )

    # Step 2 — Retrieve
    t0 = time.perf_counter()
    retrieval = await retrieve(classification, question, user_id)
    retrieve_ms = int((time.perf_counter() - t0) * 1000)

    steps.append(PipelineStep(
        id="retrieve",
        label="Retrieval",
        status="done",
        detail=f"{len(retrieval.entries)} entries (sql={retrieval.sql_count}, vector={retrieval.vector_count})",
        duration_ms=retrieve_ms,
    ))

    logger.info(
        "Retrieved: %d entries (sql=%d, vector=%d, fallback=%s)",
        len(retrieval.entries),
        retrieval.sql_count,
        retrieval.vector_count,
        retrieval.fallback_triggered,
    )

    # Step 3 — List query: return directly without synthesis
    if classification.is_list_query:
        steps.append(PipelineStep(
            id="synthesize",
            label="Synthesis (GPT-4o)",
            status="skipped",
            detail="List query — no synthesis needed",
        ))
        return QueryResponse(
            answer=f"Here are your {classification.type_filter or 'recent'} entries.",
            sources=retrieval.entries,
            has_data=len(retrieval.entries) > 0,
            fallback_triggered=False,
            finance_total=None,
            confidence="high",
            pipeline_steps=steps,
        )

    # Step 4 — Empty results: honest message, no GPT-4o call
    if not retrieval.entries:
        steps.append(PipelineStep(
            id="synthesize",
            label="Synthesis (GPT-4o)",
            status="skipped",
            detail="No entries found — skipped",
        ))
        return QueryResponse(
            answer="Nothing in your logs matches that yet.",
            sources=[],
            has_data=False,
            fallback_triggered=False,
            finance_total=None,
            confidence="low",
            pipeline_steps=steps,
        )

    # Step 5 — Synthesize
    t0 = time.perf_counter()
    synthesis = await synthesize(question, retrieval, classification)
    synth_ms = int((time.perf_counter() - t0) * 1000)

    steps.append(PipelineStep(
        id="synthesize",
        label="Synthesis (GPT-4o)",
        status="done",
        detail=f"confidence={synthesis.confidence}",
        duration_ms=synth_ms,
    ))

    return QueryResponse(
        answer=synthesis.answer,
        sources=retrieval.entries,
        has_data=True,
        fallback_triggered=retrieval.fallback_triggered,
        finance_total=retrieval.finance_total,
        confidence=synthesis.confidence,
        pipeline_steps=steps,
    )
