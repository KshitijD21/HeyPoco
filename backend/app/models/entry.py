from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Any, List, Optional

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

    amount: Optional[float] = None
    currency: Optional[str] = "USD"
    merchant: Optional[str] = None
    category: Optional[str] = None
    company: Optional[str] = None
    role: Optional[str] = None
    url: Optional[str] = None
    filename: Optional[str] = None
    due_date: Optional[str] = None
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
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {"from_attributes": True}
