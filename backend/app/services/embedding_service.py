"""
embedding_service.py
--------------------
Single responsibility: convert a plain-text string into a vector embedding
using OpenAI's text-embedding-3-small model (1536 dimensions).

This file is intentionally stateless and has zero coupling to the rest of
HeyPoco — it can be dropped into any Python project that needs OpenAI
embeddings.

Public surface
--------------
    embed(text: str) -> list[float]

Exceptions
----------
    EmptyTextError      – caller passed an empty / whitespace-only string.
    EmbeddingError      – any OpenAI API or network failure during embedding.

Typical usage
-------------
    from app.services.embedding_service import embed

    # Ingestion side — store alongside a new entry
    vector = await embed("Bought oat milk at Trader Joe's, $4.99")

    # Retrieval side — embed the user's search query
    query_vector = await embed("how much did I spend on groceries?")
"""

from openai import AsyncOpenAI, APIError, AuthenticationError

from app.config import get_settings

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Model name declared as a module constant — easy to update in one place.
_EMBEDDING_MODEL = "text-embedding-3-small"

# Number of dimensions produced by text-embedding-3-small.
# Documented here so callers know what vector size to expect.
EMBEDDING_DIMENSIONS: int = 1536


# ---------------------------------------------------------------------------
# Custom exceptions
# ---------------------------------------------------------------------------


class EmbeddingError(Exception):
    """
    Raised when the embedding API call fails for any reason:
    authentication failure, rate-limit, network timeout, model error, etc.

    Always carries a human-readable message. The original OpenAI exception
    is attached as ``__cause__`` for debugging (``raise X from orig``).
    """


class EmptyTextError(EmbeddingError):
    """
    Raised *before* the API call when the input string is empty or
    contains only whitespace.

    Checked early so callers get a precise error instead of a confusing
    Whisper / OpenAI validation failure downstream.
    """


# ---------------------------------------------------------------------------
# Internal: lazy OpenAI client (module-level singleton, not a class)
# ---------------------------------------------------------------------------

from typing import Optional

_client: Optional[AsyncOpenAI] = None


def _get_client() -> AsyncOpenAI:
    """
    Return a lazily-initialised ``AsyncOpenAI`` client.

    Reads ``OPENAI_API_KEY`` from the environment on first call.
    Subsequent calls reuse the same client instance (no overhead).

    Raises:
        EmbeddingError: If ``OPENAI_API_KEY`` is missing from the
            environment, so the caller gets a clear message before any
            network activity happens.
    """
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=get_settings().openai_api_key)
    return _client


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def embed(text: str) -> list[float]:
    """
    Convert a plain-text string into a 1536-dimensional embedding vector
    using OpenAI ``text-embedding-3-small``.

    This function is **completely stateless** — it holds no memory of
    previous calls and can safely be used from both the ingestion pipeline
    (embedding entries before storage) and the retrieval pipeline
    (embedding search queries) without any risk of cross-contamination.

    Args:
        text: The string to embed. Must be non-empty and contain at least
              one non-whitespace character. Typical inputs are a single
              sentence up to a few paragraphs; extremely long strings are
              truncated by the model at 8191 tokens.

    Returns:
        A ``list`` of ``{EMBEDDING_DIMENSIONS}`` floats representing the
        semantic position of *text* in the embedding space.
        Compatible with pgvector, cosine similarity, and dot-product search.

    Raises:
        EmptyTextError: *text* is an empty string or whitespace only.
            This check happens locally — no API call is made.
        EmbeddingError: The OpenAI API call failed (authentication error,
            rate-limit, network issue, model error, etc.).

    Example::

        vector = await embed("Bought oat milk at Trader Joe's, $4.99")
        # len(vector) == 1536
        # store vector in your database alongside the entry
    """.format(EMBEDDING_DIMENSIONS=EMBEDDING_DIMENSIONS)

    # ------------------------------------------------------------------
    # Guard: reject empty / whitespace-only input before the API call.
    # ------------------------------------------------------------------
    if not text or not text.strip():
        raise EmptyTextError(
            "embed() received an empty string. "
            "Pass a non-empty text string to generate an embedding."
        )

    client = _get_client()

    # ------------------------------------------------------------------
    # Call the Embeddings API.
    # response.data[0].embedding is a list[float] with 1536 elements.
    # ------------------------------------------------------------------
    try:
        response = await client.embeddings.create(
            model=_EMBEDDING_MODEL,
            input=text,
            # encoding_format="float" is the default — explicit for clarity.
            encoding_format="float",
        )
    except AuthenticationError as exc:
        # Separate branch so callers can distinguish "bad key" from other
        # transient failures without parsing error messages.
        raise EmbeddingError(
            f"OpenAI authentication failed — check OPENAI_API_KEY. Detail: {exc}"
        ) from exc
    except APIError as exc:
        raise EmbeddingError(
            f"OpenAI Embeddings API returned an error: {exc}"
        ) from exc

    # response.data is a list; [0] is the embedding for our single input.
    vector: list[float] = response.data[0].embedding

    return vector
