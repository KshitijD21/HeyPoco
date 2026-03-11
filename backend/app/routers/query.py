from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.routers.auth import get_current_user_id
from app.schemas.entry import QueryRequest, QueryResponse, EntryResponse, PipelineStepResponse
from app.services.query_service import query_entries

router = APIRouter(prefix="/api/query", tags=["query"])


@router.post("", response_model=QueryResponse)
async def ask_question(
    body: QueryRequest,
    user_id: str = Depends(get_current_user_id),
) -> QueryResponse:
    """Answer a natural language question using the user's logged entries (RAG)."""

    try:
        result = await query_entries(
            user_id=user_id,
            question=body.question,
            user_timezone=body.user_timezone,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Query failed: {str(e)}",
        )

    return QueryResponse(
        answer=result.answer,
        sources=[EntryResponse(**s) for s in result.sources],
        has_data=result.has_data,
        fallback_triggered=result.fallback_triggered,
        finance_total=result.finance_total,
        confidence=result.confidence,
        pipeline_steps=[
            PipelineStepResponse(
                id=s.id, label=s.label, status=s.status,
                detail=s.detail, duration_ms=s.duration_ms,
            )
            for s in result.pipeline_steps
        ],
    )
