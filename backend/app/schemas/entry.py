from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.entry import EntrySource, EntryType, ExtractedFields


# ── Request Schemas ──────────────────────────────────────────────────────────


class TranscribeRequest(BaseModel):
    """Handled via multipart form — this is a documentation model."""
    pass  # Audio file sent as UploadFile, not JSON body


class ExtractRequest(BaseModel):
    """Raw text to be processed by GPT-4o for structured extraction."""

    raw_text: str = Field(..., min_length=1, max_length=5000)


class CreateEntryRequest(BaseModel):
    """Payload for creating a new entry."""

    type: EntryType = EntryType.GENERAL
    raw_text: str = Field(..., min_length=1)
    extracted_fields: ExtractedFields = Field(default_factory=ExtractedFields)
    tags: List[str] = Field(default_factory=list)
    attachments: List[str] = Field(default_factory=list)


class UpdateEntryRequest(BaseModel):
    """Partial update payload."""

    type: Optional[EntryType] = None
    raw_text: Optional[str] = None
    extracted_fields: Optional[ExtractedFields] = None
    tags: Optional[List[str]] = None
    attachments: Optional[List[str]] = None


class QueryRequest(BaseModel):
    """Natural language question against user's entries."""

    question: str = Field(..., min_length=1, max_length=1000)


class EntryFilterParams(BaseModel):
    """Query parameters for listing entries."""

    type: Optional[EntryType] = None
    tag: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    search: Optional[str] = None
    limit: int = Field(default=50, ge=1, le=200)
    offset: int = Field(default=0, ge=0)


# ── Response Schemas ─────────────────────────────────────────────────────────


class TranscribeResponse(BaseModel):
    transcript: str


class ExtractResponse(BaseModel):
    type: EntryType
    extracted_fields: ExtractedFields
    tags: List[str]
    confidence: float = Field(ge=0.0, le=1.0)


class EntryResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    type: EntryType
    raw_text: str
    extracted_fields: ExtractedFields
    tags: List[str]
    attachments: List[str]
    entry_date: Optional[datetime] = None
    source: Optional[str] = None
    is_sensitive: bool = False
    pii_types: List[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EntryListResponse(BaseModel):
    entries: List[EntryResponse]
    total: int
    limit: int
    offset: int


class QueryResponse(BaseModel):
    answer: str
    sources: List[EntryResponse] = Field(default_factory=list)
    has_data: bool = True


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "0.1.0"


# ── Ingestion Schemas ────────────────────────────────────────────────────────


class IngestEntryResponse(BaseModel):
    """Response from the full voice/text ingestion pipeline.

    Contains the saved entry plus pipeline metadata so the frontend
    can show a rich confirmation card.
    """

    id: uuid.UUID
    user_id: uuid.UUID
    type: str
    raw_text: str
    extracted_fields: dict = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)
    entry_date: Optional[str] = None
    source: str = "text"
    is_sensitive: bool = False
    pii_types: List[str] = Field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
