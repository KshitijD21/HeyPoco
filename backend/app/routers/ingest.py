"""
ingest.py
---------
POST /api/ingest — the full voice/text ingestion pipeline.

Wires together every service built so far:
    transcribe → detect_pii → extract → embed → INSERT

Accepts **either** an audio file (multipart) or raw text (JSON body).
Never fails silently — if extraction fails, the entry is stored with
type = "general" and no extracted_fields.

This router is intentionally the only place that knows about all five
pipeline steps.  Individual services remain fully decoupled.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.routers.auth import get_current_user_id
from app.schemas.entry import IngestEntryResponse
from app.services.embedding_service import EmptyTextError, embed
from app.services.extraction_service import ExtractionError, extract
from app.services.pii_service import detect_pii
from app.services.supabase_service import create_entry
from app.services.transcription_service import (
    TranscriptionError,
    UnsupportedAudioFormatError,
    transcribe,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ingest", tags=["ingest"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _current_date_iso(tz: str = "UTC") -> str:
    """Return today's date as an ISO-8601 string in the user's timezone.

    Falls back to UTC if the supplied timezone is invalid.
    """
    try:
        from zoneinfo import ZoneInfo

        now = datetime.now(ZoneInfo(tz))
    except (KeyError, ImportError):
        # Invalid tz string or zoneinfo not available — fall back to UTC.
        now = datetime.now(timezone.utc)
    return now.date().isoformat()


# ---------------------------------------------------------------------------
# POST /api/ingest
# ---------------------------------------------------------------------------


@router.post(
    "",
    response_model=IngestEntryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest a new entry via voice or text",
)
async def ingest_entry(
    # ── Inputs (one of these must be provided) ─────────────────────────
    audio_file: Optional[UploadFile] = File(None),
    raw_text: Optional[str] = Form(None),
    # ── Optional metadata ──────────────────────────────────────────────
    user_timezone: str = Form("UTC"),
    # ── Auth ───────────────────────────────────────────────────────────
    user_id: str = Depends(get_current_user_id),
) -> IngestEntryResponse:
    """Full ingestion pipeline for a single entry.

    **Accepts multipart/form-data** with either:
    - ``audio_file`` — an audio recording (mp3, mp4, wav, m4a, webm), OR
    - ``raw_text``   — plain text typed by the user.

    Pipeline steps (in order):
    1. Transcribe audio → raw_text  *(skipped if raw_text provided)*
    2. PII detection → redacted clean_text  *(local regex, no API)*
    3. GPT-4o extraction → type, entry_date, extracted_fields, tags
    4. Embedding → 1536-dim vector  *(skipped if PII detected)*
    5. INSERT into ``entries`` table

    If extraction (step 3) fails, the entry is still saved with
    ``type = "general"`` and empty extracted_fields.
    """

    # ------------------------------------------------------------------
    # 0. Validate that we have at least one input
    # ------------------------------------------------------------------
    if not audio_file and not raw_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide either 'audio_file' or 'raw_text'.",
        )

    # Determine the input source for the DB record.
    source: str = "voice" if audio_file else "text"

    # ------------------------------------------------------------------
    # STEP 1 — Transcription (voice only)
    # ------------------------------------------------------------------
    if audio_file:
        try:
            raw_text = await transcribe(audio_file)
            logger.info("Transcription complete (%d chars)", len(raw_text))
        except UnsupportedAudioFormatError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            )
        except TranscriptionError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Transcription failed: {exc}",
            )

    # At this point raw_text is guaranteed to be a non-empty string.
    assert raw_text  # keeps type-checker happy

    # ------------------------------------------------------------------
    # STEP 2 — PII Detection (local regex, no API call)
    # ------------------------------------------------------------------
    pii_result = detect_pii(raw_text)
    logger.info(
        "PII scan: has_pii=%s, types=%s",
        pii_result.has_pii,
        pii_result.pii_types,
    )

    # ------------------------------------------------------------------
    # STEP 3 — GPT-4o Extraction
    # ------------------------------------------------------------------
    current_date = _current_date_iso(user_timezone)

    try:
        extraction = await extract(
            clean_text=pii_result.clean_text,
            current_date=current_date,
            timezone=user_timezone,
        )
        entry_type = extraction.type
        entry_date = extraction.entry_date
        extracted_fields = extraction.extracted_fields
        tags = extraction.tags
        logger.info(
            "Extraction: type=%s, entry_date=%s, tags=%s",
            entry_type,
            entry_date,
            tags,
        )
    except ExtractionError as exc:
        # Extraction failed — store as general with no fields.
        # Never fail silently: log the error, but keep going.
        logger.warning("Extraction failed, falling back to general: %s", exc)
        entry_type = "general"
        entry_date = current_date
        extracted_fields = {}
        tags = []

    # ------------------------------------------------------------------
    # STEP 4 — Embedding (skip if sensitive)
    # ------------------------------------------------------------------
    embedding = None
    if not pii_result.has_pii:
        try:
            embedding = await embed(raw_text)
            logger.info("Embedding generated (%d dims)", len(embedding))
        except (EmptyTextError, Exception) as exc:
            # Embedding failures are non-fatal — the entry is still
            # searchable via SQL filters, just not via vector search.
            logger.warning("Embedding failed (non-fatal): %s", exc)
    else:
        logger.info("Skipping embedding — entry contains PII")

    # ------------------------------------------------------------------
    # STEP 5 — Persist to Supabase
    # ------------------------------------------------------------------
    try:
        saved = await create_entry(
            user_id=user_id,
            entry_type=entry_type,
            raw_text=raw_text,
            extracted_fields=extracted_fields,
            tags=tags,
            embedding=embedding,
            entry_date=entry_date,
            source=source,
            is_sensitive=pii_result.has_pii,
            pii_types=pii_result.pii_types,
        )
    except Exception as exc:
        logger.error("Database insert failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save entry: {exc}",
        )

    logger.info("Entry saved: id=%s, type=%s", saved.get("id"), entry_type)

    return IngestEntryResponse(**saved)
