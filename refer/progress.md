# Progress Log

---

## February 28, 2026 — Ingestion Pipeline

### `backend/app/services/pii_service.py` — **NEW**
- `detect_pii(raw_text)` → `PIIResult(clean_text, has_pii, pii_types)`
- Local regex only — zero API calls, runs before any external service
- Patterns: SSN, credit card, Aadhaar, PAN, IFSC, passport, phone, email
- Returns a frozen dataclass with redacted text and list of matched PII types
- Redaction placeholders: `[SSN_REDACTED]`, `[CARD_REDACTED]`, etc.

### `backend/app/services/extraction_service.py` — **NEW**
- `extract(clean_text, current_date, timezone)` → `ExtractionResult(type, entry_date, extracted_fields, tags)`
- Single GPT-4o call using the architecture-spec prompt (§8)
- Identifies entry type: finance, journal, task, event, note, health, general
- Resolves relative dates (today/yesterday/tomorrow) against supplied current_date + timezone
- Extracts domain-specific fields into a JSONB-compatible dict (amount, merchant, mood, action, symptom, etc.)
- Generates 2-4 lowercase tags
- Validates & normalises GPT-4o output (type clamping, date parsing, null stripping)
- Raises `ExtractionError` on failure so caller can fall back to `type=general`

### `backend/app/routers/ingest.py` — **NEW**
- `POST /api/ingest` — full ingestion pipeline endpoint
- Accepts multipart/form-data: either `audio_file` (voice) or `raw_text` (typed)
- Pipeline: transcribe → detect_pii → extract → embed → INSERT
- If PII detected: sets `is_sensitive=true`, skips embedding
- If extraction fails: falls back to `type=general`, empty fields — never fails silently
- Returns saved entry as `IngestEntryResponse`

### `backend/app/models/entry.py` — **UPDATED**
- `EntryType` enum: replaced (finance, link, career, document, general) with architecture-spec types (finance, journal, task, event, note, health, general)
- `EntrySource` enum: added (voice, text)
- `ExtractedFields`: expanded to cover all domain-specific fields (amount, currency, merchant, category, breakdown, mood, energy, highlights, action, deadline, status, title, scheduled_at, person, people, symptom, medication, topic, etc.)
- `Entry` model: added `entry_date`, `source`, `is_sensitive`, `pii_types` fields

### `backend/app/schemas/entry.py` — **UPDATED**
- `EntryResponse`: added `entry_date`, `source`, `is_sensitive`, `pii_types` fields
- `IngestEntryResponse`: new schema for the ingestion endpoint response

### `backend/app/services/supabase_service.py` — **UPDATED**
- `create_entry()`: added `entry_date`, `source`, `is_sensitive`, `pii_types` parameters
- Handles both `EntryType` enum and plain string for `type` field

### `backend/app/main.py` — **UPDATED**
- Registered `ingest.router` alongside existing routers

---

## February 28, 2026

### Database Migrations — Full Rewrite & Live Run

**Migration files rewritten to match architecture spec:**
- `supabase/migrations/001_create_profiles.sql` — Added `timezone TEXT NOT NULL DEFAULT 'UTC'` column; made idempotent with `IF NOT EXISTS` and `DROP TRIGGER IF EXISTS`
- `supabase/migrations/002_create_entries.sql` — Complete rewrite: dropped ENUM type, switched `type` to free TEXT, added `source`, `entry_date`, `is_sensitive`, `pii_types` columns; removed generated columns (PostgreSQL rejects `EXTRACT()` on `TIMESTAMPTZ` as non-immutable)
- `supabase/migrations/003_enable_rls.sql` — Simplified to single `FOR ALL` policies per table; made idempotent with `DROP POLICY IF EXISTS`
- `supabase/migrations/004_create_indexes.sql` — Replaced basic indexes with full composite set: user+date, user+type+date, finance amount partial index, GIN on tags/fields, PII-safe partial index, HNSW vector index
- `supabase/migrations/005_create_match_entries.sql` — **New file.** Full `match_entries()` vector search function with `similarity_threshold`, `type_filter`, `date_from`, `date_to` parameters and PII exclusion

**Supporting files updated:**
- `supabase/schema.sql` — Full reference snapshot updated to match all migrations
- `supabase/seed.sql` — Updated with all 7 entry types (finance, journal, task, event, note, health, text)
- `backend/.env.example` — Added `DATABASE_URL` field with instructions

**Migration tooling:**
- `scripts/migrate.sh` — Shell script that reads `DATABASE_URL` from `backend/.env` and applies all migration files in order via `psql`, with `--single-transaction` and `ON_ERROR_STOP=1`
- `package.json` — Added `db:migrate` script (`pnpm db:migrate`)

**Result:** All 5 migrations successfully applied to Supabase. Tables `profiles` and `entries`, RLS policies, 7 indexes, and `match_entries()` function are live.

### `backend/test_pipeline.py` — **REWRITTEN**
- Full 5-step interactive terminal tester (transcribe → PII → extract → embed → insert)
- Coloured output, per-step timing, ASCII timing bars
- CLI flags: `--text TEXT`, `--audio FILE`, `--tz TIMEZONE`, `--user-id UUID`, `--dry-run`
- Interactive mode when no flags given — prompts user to type
- Default user: `00000000-0000-0000-0000-000000000001` (kshitij)
- **Validated:** `--text "Spent 60 dollars at Starbucks this morning" --dry-run` → type=FINANCE, amount=60, merchant=Starbucks, 4 tags, 3.16s total, 1536 dims

### `supabase/seed.sql` — **UPDATED**
- Fully uncommented — all INSERTs are live
- Test user: `kshitij` / `kshitij@heypoco.test` / UUID `00000000-0000-0000-0000-000000000001` / timezone `Asia/Kolkata`
- 7 sample entries covering all entry types (finance, journal, task, event, note, health, finance/text)
- All entries use `ON CONFLICT DO NOTHING` for safe re-runs

### `backend/app/routers/dev.py` — **NEW**
- Dev-only endpoints, **no auth required**, hardcoded test user
- `GET /api/dev/health` — confirms dev routes are active, returns test user info
- `POST /api/dev/ingest` — runs full pipeline with `user_id=00000000-…-0001`, `timezone=Asia/Kolkata`
- Only mounted when `settings.debug = True` (`DEBUG=true` in `.env`)

### `backend/app/main.py` — **UPDATED**
- Registers dev router conditionally: `if settings.debug: app.include_router(dev_router.router)`
- Prints `⚠️  DEV ROUTES ACTIVE` startup banner with test user info

### `frontend/src/app/test/page.tsx` — **NEW**
- Standalone dev test page at `/test` (not under `(dashboard)`, unprotected by auth middleware)
- Two input modes: hold-to-record mic button (MediaRecorder → WebM), text input fallback
- Posts to `POST /api/dev/ingest` — no auth header needed
- Live 5-step pipeline status indicator with animated state icons
- Full result display: type badge, raw text, PII warning (if sensitive), extracted_fields, tags, entry_date, UUID
- Quick-test phrase buttons for common entry types (finance, journal, task, event, health, PII)
- Session history table (last 5 saves)

---

## February 26, 2026 — 10:52 PM

### `backend/app/services/transcription_service.py`
- Takes an audio file (UploadFile or file path) and returns transcribed text as a string
- Uses OpenAI Whisper (`whisper-1`), supports mp3, mp4, wav, m4a, webm
- Raises `TranscriptionError` or `UnsupportedAudioFormatError` on failure

### `backend/app/services/embedding_service.py`
- Takes a plain string and returns a list of 1536 floats (vector embedding)
- Uses OpenAI `text-embedding-3-small`, shared by both ingestion and retrieval
- Raises `EmbeddingError` or `EmptyTextError` on failure
