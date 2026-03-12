from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status

from app.routers.auth import get_current_user_id
from app.schemas.entry import TranscribeResponse
from app.services.transcription_service import transcribe as transcribe_audio_svc, TranscriptionError, UnsupportedAudioFormatError

router = APIRouter(prefix="/api/transcribe", tags=["transcribe"])

ALLOWED_AUDIO_TYPES = {
    "audio/webm",
    "audio/wav",
    "audio/mp3",
    "audio/mpeg",
    "audio/ogg",
    "audio/mp4",
    "audio/m4a",
    "audio/x-m4a",
}

MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB (Whisper limit)


@router.post("", response_model=TranscribeResponse)
async def transcribe(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
) -> TranscribeResponse:
    """Transcribe an uploaded audio file using OpenAI Whisper."""

    content_type = file.content_type or ""
    if content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported audio format: {content_type}. Supported: {', '.join(ALLOWED_AUDIO_TYPES)}",
        )

    audio_bytes = await file.read()

    if len(audio_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)} MB.",
        )

    if len(audio_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty audio file",
        )

    # Reset the cursor so the service can read the file again
    await file.seek(0)

    try:
        transcript = await transcribe_audio_svc(file)
    except UnsupportedAudioFormatError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except TranscriptionError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Transcription failed: {str(e)}",
        )

    return TranscribeResponse(transcript=transcript)
