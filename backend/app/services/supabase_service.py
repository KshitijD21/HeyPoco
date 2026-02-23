import uuid
from datetime import datetime
from typing import Dict, List, Optional, Tuple

from supabase import AsyncClient, acreate_client

from app.config import get_settings
from app.models.entry import EntryType


_client: Optional[AsyncClient] = None


async def get_supabase_client() -> AsyncClient:
    """Lazy async singleton for the Supabase admin client (service role)."""
    global _client
    if _client is None:
        settings = get_settings()
        _client = await acreate_client(
            settings.supabase_url,
            settings.supabase_service_role_key,
        )
    return _client


async def get_user_client(access_token: str) -> AsyncClient:
    """Create a Supabase client scoped to a specific user's JWT — respects RLS."""
    settings = get_settings()
    client = await acreate_client(
        settings.supabase_url,
        settings.supabase_anon_key,
    )
    await client.auth.set_session(access_token, "")
    return client


async def create_entry(
    user_id: str,
    entry_type: EntryType,
    raw_text: str,
    extracted_fields: Dict,
    tags: List[str],
    attachments: Optional[List[str]] = None,
    embedding: Optional[List[float]] = None,
) -> Dict:
    """Insert a new entry into the database."""
    client = await get_supabase_client()

    data = {
        "user_id": user_id,
        "type": entry_type.value,
        "raw_text": raw_text,
        "extracted_fields": extracted_fields,
        "tags": tags,
        "attachments": attachments or [],
    }

    if embedding:
        data["embedding"] = embedding

    result = await client.table("entries").insert(data).execute()

    if not result.data:
        raise ValueError("Failed to create entry")

    return result.data[0]


async def get_entries(
    user_id: str,
    entry_type: Optional[EntryType] = None,
    tag: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> Tuple[List[Dict], int]:
    """Fetch entries for a user with optional filters. Returns (entries, total_count)."""
    client = await get_supabase_client()

    query = client.table("entries").select("*", count="exact").eq("user_id", user_id)

    if entry_type:
        query = query.eq("type", entry_type.value)

    if tag:
        query = query.contains("tags", [tag])

    if date_from:
        query = query.gte("created_at", date_from.isoformat())

    if date_to:
        query = query.lte("created_at", date_to.isoformat())

    if search:
        query = query.ilike("raw_text", f"%{search}%")

    query = query.order("created_at", desc=True).range(offset, offset + limit - 1)

    result = await query.execute()

    return result.data or [], result.count or 0


async def get_entry_by_id(user_id: str, entry_id: str) -> Optional[Dict]:
    """Fetch a single entry by ID, scoped to user."""
    client = await get_supabase_client()

    result = (
        await client.table("entries")
        .select("*")
        .eq("id", entry_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    return result.data


async def update_entry(user_id: str, entry_id: str, updates: Dict) -> Dict:
    """Update an existing entry. Only non-None fields are applied."""
    client = await get_supabase_client()

    clean_updates = {k: v for k, v in updates.items() if v is not None}
    clean_updates["updated_at"] = datetime.utcnow().isoformat()

    result = (
        await client.table("entries")
        .update(clean_updates)
        .eq("id", entry_id)
        .eq("user_id", user_id)
        .execute()
    )

    if not result.data:
        raise ValueError(f"Entry {entry_id} not found or not owned by user")

    return result.data[0]


async def delete_entry(user_id: str, entry_id: str) -> bool:
    """Delete an entry by ID, scoped to user."""
    client = await get_supabase_client()

    result = (
        await client.table("entries")
        .delete()
        .eq("id", entry_id)
        .eq("user_id", user_id)
        .execute()
    )

    return bool(result.data)


async def search_entries_by_embedding(
    user_id: str,
    embedding: List[float],
    match_count: int = 10,
) -> List[Dict]:
    """Find the most relevant entries using vector similarity (cosine distance).
    Requires the `match_entries` Postgres function defined in schema.sql."""
    client = await get_supabase_client()

    result = await client.rpc(
        "match_entries",
        {
            "query_embedding": embedding,
            "match_user_id": user_id,
            "match_count": match_count,
        },
    ).execute()

    return result.data or []
