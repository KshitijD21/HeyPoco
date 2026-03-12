"""
transcription_service.py
------------------------
Single responsibility: turn an audio file into transcribed text via
OpenAI Whisper (model: whisper-1).

Public surface
--------------
    transcribe(audio_file) -> str

Exceptions
----------
    UnsupportedAudioFormatError  – file extension not in SUPPORTED_FORMATS
    TranscriptionError           – any Whisper / network / I/O failure
"""

from pathlib import Path
from typing import Union

from fastapi import UploadFile
from openai import AsyncOpenAI, APIError, AuthenticationError

from app.config import get_settings

# ---------------------------------------------------------------------------
# Custom exceptions
# ---------------------------------------------------------------------------


class TranscriptionError(Exception):
    """
    Raised when audio transcription fails for any reason:
    network error, authentication failure, Whisper model error, etc.
    """


class UnsupportedAudioFormatError(TranscriptionError):
    """
    Raised before the API call when the audio file has an extension
    that Whisper does not accept.
    """


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Formats accepted by the Whisper API as of 2024.
SUPPORTED_FORMATS: frozenset[str] = frozenset({"mp3", "mp4", "wav", "m4a", "webm"})

# Whisper model name — declared here so this file stays self-contained.
_WHISPER_MODEL = "whisper-1"


# ---------------------------------------------------------------------------
# Internal: lazy OpenAI client (module-level singleton, not a class)
# ---------------------------------------------------------------------------

from typing import Union, Optional
from pathlib import Path

_client: Optional[AsyncOpenAI] = None


def _get_client() -> AsyncOpenAI:
    """
    Return a lazily-initialised AsyncOpenAI client.

    Reads OPENAI_API_KEY from the environment on first call.
    Raises TranscriptionError immediately if the key is absent so the
    caller gets a clear message instead of a cryptic auth failure later.
    """
    global _client
    if _client is None:
        api_key = get_settings().openai_api_key
        _client = AsyncOpenAI(api_key=api_key)
    return _client


# ---------------------------------------------------------------------------
# Internal: format validation helper
# ---------------------------------------------------------------------------


def _validate_extension(filename: str) -> None:
    """
    Ensure *filename* has a Whisper-supported extension.

    Args:
        filename: The original file name (e.g. "recording.m4a").

    Raises:
        UnsupportedAudioFormatError: If the extension is absent or
            not in SUPPORTED_FORMATS.
    """
    ext = Path(filename).suffix.lstrip(".").lower()
    if not ext or ext not in SUPPORTED_FORMATS:
        raise UnsupportedAudioFormatError(
            f"Unsupported audio format '.{ext or '(none)'}'. "
            f"Whisper accepts: {', '.join(sorted(SUPPORTED_FORMATS))}."
        )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def transcribe(audio_file: Union[UploadFile, str, Path]) -> str:
    """
    Transcribe an audio file to plain text using OpenAI Whisper.

    Accepts three input forms so the same function works in HTTP handlers
    (UploadFile) and background jobs / tests (file paths).

    Args:
        audio_file: One of —
            • ``fastapi.UploadFile``  – multipart upload from an HTTP request.
            • ``str``                 – file-system path to the audio file.
            • ``pathlib.Path``        – file-system path to the audio file.

    Returns:
        Transcribed text as a plain Python ``str``. The string is the
        verbatim output from Whisper — no post-processing applied.

    Raises:
        UnsupportedAudioFormatError: The file extension is not in
            ``{mp3, mp4, wav, m4a, webm}``. Checked *before* any API call.
        TranscriptionError: The OpenAI API call failed (authentication
            error, rate-limit, network issue, model error, etc.).
    """
    client = _get_client()

    # ------------------------------------------------------------------
    # Path 1: FastAPI UploadFile (HTTP multipart upload)
    # ------------------------------------------------------------------
    if not isinstance(audio_file, (str, Path)):
        filename = audio_file.filename or "audio"
        _validate_extension(filename)

        # Read bytes into memory — Whisper's input limit is 25 MB.
        audio_bytes = await audio_file.read()

        # The SDK accepts a (filename, bytes, content_type) tuple for
        # in-memory data so Whisper can detect the codec.
        mime = audio_file.content_type or "application/octet-stream"
        file_tuple = (filename, audio_bytes, mime)

        try:
            response = await client.audio.transcriptions.create(
                model=_WHISPER_MODEL,
                file=file_tuple,       # type: ignore[arg-type]  # SDK accepts tuple
            )
        except AuthenticationError as exc:
            raise TranscriptionError(
                f"OpenAI authentication failed — check OPENAI_API_KEY. Detail: {exc}"
            ) from exc
        except APIError as exc:
            raise TranscriptionError(
                f"Whisper API returned an error: {exc}"
            ) from exc

        # response.text contains the plain transcription string.
        return response.text

    # ------------------------------------------------------------------
    # Path 2: File-system path (str or Path)
    # ------------------------------------------------------------------
    path = Path(audio_file)
    _validate_extension(path.name)

    try:
        # Open in binary mode; the SDK reads from the file-like object.
        with open(path, "rb") as fh:
            try:
                response = await client.audio.transcriptions.create(
                    model=_WHISPER_MODEL,
                    file=fh,
                )
            except AuthenticationError as exc:
                raise TranscriptionError(
                    f"OpenAI authentication failed — check OPENAI_API_KEY. Detail: {exc}"
                ) from exc
            except APIError as exc:
                raise TranscriptionError(
                    f"Whisper API returned an error: {exc}"
                ) from exc

    except FileNotFoundError as exc:
        raise TranscriptionError(
            f"Audio file not found at path: {path}"
        ) from exc
    except OSError as exc:
        raise TranscriptionError(
            f"Could not open audio file '{path}': {exc}"
        ) from exc

    return response.text
