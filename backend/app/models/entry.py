from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class EntryType(str, Enum):
    """Supported entry categories."""

    FINANCE = "finance"
    LINK = "link"
    CAREER = "career"
    DOCUMENT = "document"
    GENERAL = "general"


class ExtractedFields(BaseModel):
    """Structured data extracted by GPT-4o from raw user input."""

    amount: float | None = None
    currency: str | None = "USD"
    merchant: str | None = None
    category: str | None = None
    company: str | None = None
    role: str | None = None
    url: str | None = None
    filename: str | None = None
    due_date: str | None = None
    notes: str | None = None


class Entry(BaseModel):
    """Core data model for a logged entry."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    user_id: uuid.UUID
    type: EntryType = EntryType.GENERAL
    raw_text: str
    extracted_fields: ExtractedFields = Field(default_factory=ExtractedFields)
    tags: list[str] = Field(default_factory=list)
    attachments: list[str] = Field(default_factory=list)
    embedding: list[float] | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {"from_attributes": True}
