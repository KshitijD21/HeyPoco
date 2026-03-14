from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    # App
    app_name: str = "HeyPoco API"
    debug: bool = False
    cors_origins: list[str] = ["http://localhost:3333", "http://localhost:3000"]

    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str

    # OpenAI
    openai_api_key: str
    openai_model: str = "gpt-4o"
    openai_whisper_model: str = "whisper-1"
    openai_embedding_model: str = "text-embedding-3-small"

    # Waitlist / access requests
    resend_api_key: Optional[str] = None
    waitlist_notify_email: Optional[str] = None

    # Dev / testing
    test_user_id: Optional[str] = None

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton — avoids re-reading env on every request."""
    return Settings()
