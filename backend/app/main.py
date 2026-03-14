from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import entries, extract, ingest, query, transcribe, waitlist
from app.routers import dev as dev_router
from app.schemas.entry import HealthResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown hooks."""
    # Startup: validate configuration eagerly
    settings = get_settings()
    print(f"🚀 {settings.app_name} starting up (debug={settings.debug})")
    yield
    # Shutdown
    print(f"👋 {settings.app_name} shutting down")


app = FastAPI(
    title="HeyPoco API",
    description="Voice-first personal life logger — backend API",
    version="0.1.0",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────

settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────

app.include_router(transcribe.router)
app.include_router(extract.router)
app.include_router(entries.router)
app.include_router(ingest.router)
app.include_router(query.router)
app.include_router(waitlist.router)

# Dev-only routes — only mounted when DEBUG=True.
# Bypasses auth so we can test the pipeline without a JWT.
# NEVER enable in production.
if settings.debug:
    app.include_router(dev_router.router)
    print("⚠️  DEV ROUTES ACTIVE — POST /api/dev/ingest (no auth) — test user: kshitij")


# ── Health Check ─────────────────────────────────────────────────────────────


@app.get("/api/health", response_model=HealthResponse, tags=["health"])
async def health_check() -> HealthResponse:
    """Liveness probe — returns OK if the server is running."""
    return HealthResponse()
