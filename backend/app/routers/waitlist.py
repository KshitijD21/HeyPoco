"""
waitlist.py
-----------
POST /api/waitlist — public endpoint (no auth).

Saves every access request to the `waitlist` Supabase table,
then fires a best-effort email notification via Resend.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter
from pydantic import BaseModel, EmailStr

from app.config import get_settings
from app.services.supabase_service import get_supabase_client

logger = logging.getLogger(__name__)

router = APIRouter(tags=["waitlist"])


class WaitlistRequest(BaseModel):
    email: EmailStr
    message: str = ""


class WaitlistResponse(BaseModel):
    ok: bool


@router.post("/api/waitlist", response_model=WaitlistResponse)
async def join_waitlist(payload: WaitlistRequest) -> WaitlistResponse:
    """
    Save an access request and notify the owner.

    - Always saves to the `waitlist` table (source of truth).
    - Attempts email notification via Resend (best-effort, never blocks success).
    - No auth required — this is a pre-login form.
    """
    settings = get_settings()

    # ── Step 1: Save to Supabase ─────────────────────────────────────────────
    try:
        client = await get_supabase_client()
        result = await (
            client.table("waitlist")
            .upsert(
                {"email": payload.email, "message": payload.message or None},
                on_conflict="email",
            )
            .execute()
        )
        if hasattr(result, "error") and result.error:
            logger.error("Waitlist: DB error for %s: %s", payload.email, result.error)
        else:
            logger.info("Waitlist: saved %s", payload.email)
    except Exception as exc:
        # Log but never propagate — table missing or DB down should not block the user
        logger.error("Waitlist: DB save failed for %s: %s", payload.email, exc)

    # ── Step 2: Email notification (best-effort) ─────────────────────────────
    resend_key = settings.resend_api_key
    notify_email = settings.waitlist_notify_email

    if resend_key and notify_email:
        body = "\n".join([
            "New access request for HeyPoco",
            "",
            f"From: {payload.email}",
            f"Message: {payload.message or '(none)'}",
            "",
            f"Sent at: {datetime.now(timezone.utc).isoformat()}",
        ])
        try:
            async with httpx.AsyncClient(timeout=10) as http:
                resp = await http.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {resend_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "from": "onboarding@resend.dev",
                        "to": [notify_email],
                        "subject": f"HeyPoco access request from {payload.email}",
                        "text": body,
                    },
                )
            if resp.is_success:
                logger.info("Waitlist: email sent (id=%s)", resp.json().get("id"))
            else:
                logger.warning("Waitlist: Resend %s — %s", resp.status_code, resp.text)
        except Exception as exc:
            logger.warning("Waitlist: email failed (non-fatal): %s", exc)
    else:
        logger.info("Waitlist: email skipped (RESEND_API_KEY or WAITLIST_NOTIFY_EMAIL not set)")

    return WaitlistResponse(ok=True)
