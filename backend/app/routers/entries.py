from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.models.entry import EntryType
from app.routers.auth import get_current_user_id
from app.schemas.entry import (
    CreateEntryRequest,
    EntryListResponse,
    EntryResponse,
    UpdateEntryRequest,
)
from app.services.openai_service import generate_embedding
from app.services.supabase_service import (
    create_entry,
    delete_entry,
    get_entries,
    get_entry_by_id,
    update_entry,
)

router = APIRouter(prefix="/api/entries", tags=["entries"])


@router.get("", response_model=EntryListResponse)
async def list_entries(
    user_id: str = Depends(get_current_user_id),
    type: EntryType | None = None,
    tag: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    search: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> EntryListResponse:
    """List entries for the authenticated user with optional filters."""

    from app.utils.helpers import safe_parse_datetime

    entries, total = await get_entries(
        user_id=user_id,
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


@router.post("", response_model=EntryResponse, status_code=status.HTTP_201_CREATED)
async def create_new_entry(
    body: CreateEntryRequest,
    user_id: str = Depends(get_current_user_id),
) -> EntryResponse:
    """Create a new entry with optional embedding generation."""

    embedding = await generate_embedding(body.raw_text)

    entry = await create_entry(
        user_id=user_id,
        entry_type=body.type,
        raw_text=body.raw_text,
        extracted_fields=body.extracted_fields.model_dump(),
        tags=body.tags,
        attachments=body.attachments,
        embedding=embedding,
    )

    return EntryResponse(**entry)


@router.get("/{entry_id}", response_model=EntryResponse)
async def get_single_entry(
    entry_id: str,
    user_id: str = Depends(get_current_user_id),
) -> EntryResponse:
    """Get a single entry by ID."""

    entry = await get_entry_by_id(user_id, entry_id)

    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Entry {entry_id} not found",
        )

    return EntryResponse(**entry)


@router.patch("/{entry_id}", response_model=EntryResponse)
async def update_existing_entry(
    entry_id: str,
    body: UpdateEntryRequest,
    user_id: str = Depends(get_current_user_id),
) -> EntryResponse:
    """Update an existing entry. Only provided fields are changed."""

    updates = body.model_dump(exclude_none=True)

    if "extracted_fields" in updates:
        updates["extracted_fields"] = body.extracted_fields.model_dump() if body.extracted_fields else None

    try:
        entry = await update_entry(user_id, entry_id, updates)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Entry {entry_id} not found",
        )

    return EntryResponse(**entry)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_entry(
    entry_id: str,
    user_id: str = Depends(get_current_user_id),
) -> None:
    """Delete an entry by ID."""

    deleted = await delete_entry(user_id, entry_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Entry {entry_id} not found",
        )
