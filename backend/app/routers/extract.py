from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.routers.auth import get_current_user_id
from app.schemas.entry import ExtractRequest, ExtractResponse
from app.services.pii_service import detect_pii
from app.services.extraction_service import extract as extract_svc, ExtractionError

router = APIRouter(prefix="/api/extract", tags=["extract"])


@router.post("", response_model=ExtractResponse)
async def extract(
    body: ExtractRequest,
    user_id: str = Depends(get_current_user_id),
) -> ExtractResponse:
    """Extract structured fields from raw text using the full pipeline (PII → GPT-4o)."""

    # Step 1: PII detection (local regex, zero API calls)
    pii_result = detect_pii(body.raw_text)

    # Step 2: GPT-4o extraction on the cleaned text
    current_date = datetime.now(timezone.utc).date().isoformat()

    try:
        result = await extract_svc(
            clean_text=pii_result.clean_text,
            current_date=current_date,
            timezone="UTC",
        )
    except ExtractionError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Extraction failed: {str(e)}",
        )

    return ExtractResponse(
        type=result.type,
        extracted_fields=result.extracted_fields,
        tags=result.tags,
        confidence=0.9,  # extraction_service doesn't return confidence; use default
    )
