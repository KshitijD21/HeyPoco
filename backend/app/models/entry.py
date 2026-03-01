from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Any, List, Optional

from pydantic import BaseModel, Field


class EntryType(str, Enum):
    """Supported entry categories — matches heypoco_architecture.md §5."""

    FINANCE = "finance"
    JOURNAL = "journal"
    TASK = "task"
    EVENT = "event"
    NOTE = "note"
    HEALTH = "health"
    GENERAL = "general"


class EntrySource(str, Enum):
    """How the entry was created."""

    VOICE = "voice"
    TEXT = "text"


class ExtractedFields(BaseModel):
    """Structured data extracted by GPT-4o from raw user input.

    Uses a flexible dict internally — keys differ per entry type.
    See heypoco_architecture.md §4 for the JSONB contract.
    """

    # ── Finance ──────────────────────────────────────────────────────
    amount: Optional[float] = None
    currency: Optional[str] = None
    merchant: Optional[str] = None
    category: Optional[str] = None
    breakdown: Optional[List[Any]] = None

    # ── Journal ──────────────────────────────────────────────────────
    mood: Optional[str] = None
    energy: Optional[str] = None
    highlights: Optional[List[str]] = None

    # ── Task ─────────────────────────────────────────────────────────
    action: Optional[str] = None
    deadline: Optional[str] = None
    status: Optional[str] = None

    # ── Event ────────────────────────────────────────────────────────
    title: Optional[str] = None
    scheduled_at: Optional[str] = None
    location: Optional[str] = None
    duration_minutes: Optional[int] = None
    reminder: Optional[bool] = None

    # ── Note / Health / Shared ───────────────────────────────────────
    person: Optional[str] = None
    people: Optional[List[str]] = None
    topic: Optional[str] = None
    project: Optional[str] = None
    symptom: Optional[str] = None
    medication: Optional[str] = None
    severity: Optional[str] = None
    time: Optional[str] = None
    notes: Optional[str] = None


class Entry(BaseModel):
    """Core data model for a logged entry."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    user_id: uuid.UUID
    type: EntryType = EntryType.GENERAL
    raw_text: str
    extracted_fields: ExtractedFields = Field(default_factory=ExtractedFields)
    tags: List[str] = Field(default_factory=list)
    attachments: List[str] = Field(default_factory=list)
    embedding: Optional[List[float]] = None
    # ── New fields (architecture spec §3.2) ──────────────────────────
    entry_date: Optional[datetime] = None
    source: EntrySource = EntrySource.TEXT
    is_sensitive: bool = False
    pii_types: List[str] = Field(default_factory=list)
    # ─────────────────────────────────────────────────────────────────
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {"from_attributes": True}
