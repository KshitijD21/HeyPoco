"""
dev.py
------
Development-only endpoints — only mounted when DEBUG=True in settings.

These routes exist exclusively for local testing and are NEVER exposed in
production.  They bypass authentication deliberately so you don't need to
log in or carry a JWT while running end-to-end pipeline tests.

Endpoints
---------
    POST /api/dev/ingest   — full pipeline (transcribe → PII → extract → embed → INSERT)
                             using the hardcoded test user (kshitij).

    GET  /api/dev/health   — quick check that the dev router is live.

TEST USER
---------
    Name : Kshitij
    UUID : af3dfe06-a4e0-4251-bd80-d4a1058bae11
    Email: kshitij@heypoco.test

    Create this user in Supabase Auth first, then run supabase/seed.sql.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status

from app.config import get_settings
from app.schemas.entry import IngestEntryResponse, QueryResponse, EntryResponse, EntryListResponse
from app.services.embedding_service import EmptyTextError, embed
from app.services.extraction_service import ExtractionError, extract
from app.services.pii_service import detect_pii
from app.services.supabase_service import create_entry, get_entries
from app.services.query_service import query_entries
from app.services.transcription_service import (
    TranscriptionError,
    UnsupportedAudioFormatError,
    transcribe,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/dev", tags=["dev"])

# ---------------------------------------------------------------------------
# Test user — read from settings (set TEST_USER_ID in backend/.env)
# ---------------------------------------------------------------------------

def _get_test_user_id() -> str:
    uid = get_settings().test_user_id
    if not uid:
        raise RuntimeError(
            "TEST_USER_ID is not set. Add it to backend/.env — "
            "see supabase/seed.sql for setup instructions."
        )
    return uid


def _today_iso(tz: str = "UTC") -> str:
    """Today's date as ISO string in the test timezone."""
    try:
        from zoneinfo import ZoneInfo
        now = datetime.now(ZoneInfo(tz))
    except (KeyError, ImportError):
        now = datetime.now(timezone.utc)
    return now.date().isoformat()


# ---------------------------------------------------------------------------
# GET /api/dev/health  — sanity probe
# ---------------------------------------------------------------------------


@router.get("/health", tags=["dev"])
async def dev_health() -> dict:
    """Confirm the dev router is active. Returns 404 in production (DEBUG=False)."""
    return {
        "status": "dev router active",
        "test_user_id": _get_test_user_id(),
        "warning": "This endpoint is for LOCAL DEVELOPMENT only. Never expose in production.",
    }


# ---------------------------------------------------------------------------
# POST /api/dev/ingest  — full pipeline, no auth
# ---------------------------------------------------------------------------


@router.post(
    "/ingest",
    response_model=IngestEntryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="[DEV] Full pipeline ingest — no auth, test user only",
)
async def dev_ingest_entry(
    audio_file: Optional[UploadFile] = File(None),
    raw_text: Optional[str] = Form(None),
    user_timezone: str = Form("UTC"),
) -> IngestEntryResponse:
    """
    Identical to POST /api/ingest but requires no JWT.

    Uses the hardcoded test user (kshitij, UUID ends in ...0001).
    Only available when the server starts with DEBUG=True.

    Accepts multipart/form-data with either:
    - ``audio_file`` — an audio recording (webm, mp3, mp4, wav, m4a)
    - ``raw_text``   — plain text

    Pipeline: transcribe → PII detect → extract → embed → INSERT
    """

    if not audio_file and not raw_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide either 'audio_file' or 'raw_text'.",
        )

    source = "voice" if audio_file else "text"

    # ── STEP 1: Transcription ───────────────────────────────────────
    if audio_file:
        try:
            raw_text = await transcribe(audio_file)
        except UnsupportedAudioFormatError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        except TranscriptionError as exc:
            raise HTTPException(status_code=502, detail=f"Transcription failed: {exc}")

    assert raw_text

    # ── STEP 2: PII Detection ───────────────────────────────────────
    pii_result = detect_pii(raw_text)

    # ── STEP 3: Extraction ──────────────────────────────────────────
    today = _today_iso(user_timezone)
    try:
        extraction = await extract(
            clean_text=pii_result.clean_text,
            current_date=today,
            timezone=user_timezone,
        )
        entry_type       = extraction.type
        entry_date       = extraction.entry_date
        extracted_fields = extraction.extracted_fields
        tags             = extraction.tags
    except ExtractionError as exc:
        logger.warning("[DEV] Extraction failed, using fallback: %s", exc)
        entry_type, entry_date, extracted_fields, tags = "general", today, {}, []

    # ── STEP 4: Embedding (skip if PII) ────────────────────────────
    embedding = None
    if not pii_result.has_pii:
        try:
            embedding = await embed(raw_text)
        except (EmptyTextError, Exception) as exc:
            logger.warning("[DEV] Embedding failed (non-fatal): %s", exc)

    # ── STEP 5: Persist ─────────────────────────────────────────────
    try:
        saved = await create_entry(
            user_id=_get_test_user_id(),
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
        raise HTTPException(status_code=500, detail=f"Failed to save entry: {exc}")

    logger.info("[DEV] Entry saved: id=%s, type=%s", saved.get("id"), entry_type)
    return IngestEntryResponse(**saved)


# ---------------------------------------------------------------------------
# POST /api/dev/query  — RAG search, no auth
# ---------------------------------------------------------------------------


@router.post("/query", response_model=QueryResponse, summary="[DEV] Query entries — no auth")
async def dev_query(body: dict) -> QueryResponse:
    """Identical to POST /api/query but requires no JWT. Uses test user."""
    question = body.get("question", "")
    if not question.strip():
        raise HTTPException(status_code=400, detail="question is required")

    try:
        result = await query_entries(_get_test_user_id(), question)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Query failed: {exc}")

    return QueryResponse(
        answer=result["answer"],
        sources=[EntryResponse(**s) for s in result["sources"]],
        has_data=result["has_data"],
    )


# ---------------------------------------------------------------------------
# GET /api/dev/entries  — list entries, no auth
# ---------------------------------------------------------------------------


@router.get("/entries", response_model=EntryListResponse, summary="[DEV] List entries — no auth")
async def dev_list_entries(
    type: Optional[str] = None,
    tag: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> EntryListResponse:
    """Identical to GET /api/entries but requires no JWT. Uses test user."""
    from app.utils.helpers import safe_parse_datetime

    entries, total = await get_entries(
        user_id=_get_test_user_id(),
        entry_type=type,
        tag=tag,
        date_from=safe_parse_datetime(date_from),
        date_to=safe_parse_datetime(date_to),
        search=search,
        limit=limit,
        offset=offset,
    )

    return EntryListResponse(
        entries=[EntryResponse(**e) for e in entries],
        total=total,
        limit=limit,
        offset=offset,
    )
