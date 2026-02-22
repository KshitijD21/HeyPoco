from __future__ import annotations

from fastapi import Depends, HTTPException, Request, status
from supabase import AsyncClient, acreate_client

from app.config import get_settings


async def get_current_user_id(request: Request) -> str:
    """Extract and verify the user ID from the Supabase JWT in the Authorization header.

    Expected header format: `Authorization: Bearer <supabase-access-token>`
    """
    auth_header = request.headers.get("Authorization")

    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )

    token = auth_header.removeprefix("Bearer ").strip()

    try:
        settings = get_settings()
        client: AsyncClient = await acreate_client(
            settings.supabase_url,
            settings.supabase_anon_key,
        )

        user_response = await client.auth.get_user(token)

        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )

        return str(user_response.user.id)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
        )
