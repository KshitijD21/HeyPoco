# Sprint 01 — Project Foundation

**Goal:** Scaffold the entire project and get it to a state where all files exist, compile, and the architecture is clear.

**Date:** 2026-02-22
**Status:** ✅ Complete

## Tasks

- [x] Scaffold Next.js 14 frontend
- [x] Create FastAPI backend structure
- [x] Implement all backend services (OpenAI, Supabase, Query)
- [x] Implement all backend routers (auth, transcribe, extract, entries, query)
- [x] Create frontend types, API client, stores
- [x] Create React Query provider + custom hooks
- [x] Build all UI components (VoiceCapture, ConfirmationCard, EntryFeed, EntryCard, QueryBar, CategoryFilter)
- [x] Create app pages and layouts (auth, dashboard)
- [x] Add Supabase auth middleware
- [x] Write database schema + migrations
- [x] Set up project tracking (.project/)
- [x] Write root README
- [x] Redesign Login Page with Zen aesthetics
- [x] Implement continuous voice/chat interface interaction
- [x] Implement 11-card Master Component Library (Career, Health, Travel, Finance, etc.)
- [x] Create Visual Language Showcase at `/experiments/components`
- [x] Add social login (Google) visual option
- [x] Refine scroll blurs and immersive end-to-end layout
- [x] Redesign Signup Page with Zen aesthetics
- [x] Expand Master Component Library to 21 rich cards (AI States, Lifestyle, Academic, Professional, Vault)
- [x] Update `.project/use-cases.md` with 18 comprehensive lifecycle categories
- [x] Build `transcription_service.py` — async Whisper service that converts an audio file (UploadFile or file path) to plain text, with custom `TranscriptionError` and `UnsupportedAudioFormatError` - Kshitij - 02/26/2026
- [x] Build `embedding_service.py` — async stateless embedding service using `text-embedding-3-small`, returns 1536-float vector, shared by both ingestion and retrieval, with custom `EmbeddingError` and `EmptyTextError` - Kshitij - 02/26/2026
- [x] Rewrite all database migration files (001–004) to match architecture spec — free TEXT type, `source`, `entry_date`, `is_sensitive`, `pii_types` columns, correct composite indexes, idempotent guards - Kshitij - 02/28/2026
- [x] Create `supabase/migrations/005_create_match_entries.sql` — `match_entries()` vector search function with similarity threshold, type filter, date range, and PII exclusion - Kshitij - 02/28/2026
- [x] Create `scripts/migrate.sh` + `pnpm db:migrate` — shell script that reads `DATABASE_URL` from `backend/.env` and applies all migrations via psql in order - Kshitij - 02/28/2026
- [x] Run all 5 migrations against live Supabase — `profiles`, `entries`, RLS policies, 7 indexes, and `match_entries()` function confirmed live - Kshitij - 02/28/2026
- [x] Redesign Onboarding experience with Ultra-Premium "AI x Human" aesthetic
- [x] Fix layout stability issues and implement glassmorphism across preview components
- [x] Refine visual language to "Soft Zen" Indigo palette with primary black branding
- [x] Perform final end-to-end visual audit of the onboarding flow
- [x] Verify visual language consistency across all showcase components
- [x] Migrate from npm to pnpm across the project - Kshitij - 02/24/2026
- [x] Set up root `package.json` as orchestrator to run frontend + backend concurrently via `pnpm dev` - Kshitij - 02/24/2026
- [x] Assign unique dev ports — frontend `:3333`, backend `:8888` - Kshitij - 02/24/2026
- [x] Fix `.gitignore` — untrack `backend/venv` and `backend/.env` that were committed from another machine - Kshitij - 02/24/2026
- [x] Update CORS origins to include `localhost:3333` - Kshitij - 02/24/2026

## Notes

- This sprint focused on scaffolding + live database setup
- Database is live on Supabase — `profiles`, `entries`, RLS, indexes, and `match_entries()` function all running
- Next sprint should focus on the full ingestion pipeline: `pii_service.py`, `extraction_service.py`, `POST /entries`, and end-to-end voice → DB test
