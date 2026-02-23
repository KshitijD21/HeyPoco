import json
from typing import Dict, List, Optional

from openai import AsyncOpenAI

from app.config import get_settings
from app.models.entry import EntryType, ExtractedFields


_client: Optional[AsyncOpenAI] = None


def get_openai_client() -> AsyncOpenAI:
    """Lazy singleton for the OpenAI async client."""
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=get_settings().openai_api_key)
    return _client


EXTRACTION_SYSTEM_PROMPT = """You are HeyPoco's AI extraction engine. Given raw user input, you must:

1. Determine the entry type: finance, link, career, document, or general.
2. Extract all structured fields that are present.
3. Generate relevant tags (1-5 short lowercase tags).
4. Rate your confidence from 0.0 to 1.0.

Return a JSON object with exactly this structure:
{
  "type": "<finance|link|career|document|general>",
  "extracted_fields": {
    "amount": <number or null>,
    "currency": "<string or null>",
    "merchant": "<string or null>",
    "category": "<string or null>",
    "company": "<string or null>",
    "role": "<string or null>",
    "url": "<string or null>",
    "filename": "<string or null>",
    "due_date": "<ISO date string or null>",
    "notes": "<string or null>"
  },
  "tags": ["tag1", "tag2"],
  "confidence": <float>
}

Rules:
- For finance entries, always extract amount and merchant if mentioned.
- For career entries, extract company and role if mentioned.
- For link entries, always extract the URL.
- Be conservative: if something isn't clearly stated, leave it null.
- Tags should be descriptive but concise: "groceries", "interview", "reference", etc.
- Only return raw JSON, no markdown fencing or extra text."""


async def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    """Transcribe audio bytes using OpenAI Whisper."""
    client = get_openai_client()
    settings = get_settings()

    transcript = await client.audio.transcriptions.create(
        model=settings.openai_whisper_model,
        file=(filename, audio_bytes),
        response_format="text",
    )

    return transcript.strip()


async def extract_entry(raw_text: str) -> Dict:
    """Extract structured fields from raw text using GPT-4o."""
    client = get_openai_client()
    settings = get_settings()

    response = await client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
            {"role": "user", "content": raw_text},
        ],
        temperature=0.1,
        response_format={"type": "json_object"},
    )

    content = response.choices[0].message.content
    if not content:
        raise ValueError("Empty response from extraction model")

    parsed = json.loads(content)

    return {
        "type": EntryType(parsed.get("type", "general")),
        "extracted_fields": ExtractedFields(**parsed.get("extracted_fields", {})),
        "tags": parsed.get("tags", []),
        "confidence": float(parsed.get("confidence", 0.5)),
    }


async def generate_embedding(text: str) -> List[float]:
    """Generate a text embedding using OpenAI's embedding model."""
    client = get_openai_client()
    settings = get_settings()

    response = await client.embeddings.create(
        model=settings.openai_embedding_model,
        input=text,
    )

    return response.data[0].embedding


async def answer_query(question: str, context_entries: List[Dict]) -> str:
    """Answer a natural language question using entry context."""
    client = get_openai_client()
    settings = get_settings()

    context_text = "\n\n".join(
        f"[{entry.get('type', 'general').upper()} — {entry.get('created_at', 'unknown date')}]\n"
        f"Raw: {entry.get('raw_text', '')}\n"
        f"Fields: {json.dumps(entry.get('extracted_fields', {}), default=str)}"
        for entry in context_entries
    )

    system_prompt = (
        "You are HeyPoco, a personal life assistant. The user is asking a question about their own logged data. "
        "Answer using ONLY the provided context entries. Be concise, specific, and honest. "
        "If the data doesn't contain enough information to answer, say so clearly — never fabricate information.\n\n"
        f"USER'S LOGGED ENTRIES:\n{context_text}"
    )

    response = await client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question},
        ],
        temperature=0.2,
    )

    content = response.choices[0].message.content
    return content.strip() if content else "I couldn't generate an answer. Please try rephrasing your question."
