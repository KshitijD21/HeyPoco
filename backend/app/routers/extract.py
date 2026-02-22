from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.routers.auth import get_current_user_id
from app.schemas.entry import ExtractRequest, ExtractResponse
from app.services.openai_service import extract_entry

router = APIRouter(prefix="/api/extract", tags=["extract"])


@router.post("", response_model=ExtractResponse)
async def extract(
    body: ExtractRequest,
    user_id: str = Depends(get_current_user_id),
) -> ExtractResponse:
    """Extract structured fields from raw text using GPT-4o."""

    try:
        result = await extract_entry(body.raw_text)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Extraction failed: {str(e)}",
        )

    return ExtractResponse(
        type=result["type"],
        extracted_fields=result["extracted_fields"],
        tags=result["tags"],
        confidence=result["confidence"],
    )
