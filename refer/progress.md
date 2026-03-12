# Progress Log

---

## March 10, 2026 — Retrieval Pipeline (Complete Rebuild)

Full rewrite of the retrieval/query pipeline. The old `query_service.py` had fundamental bugs (wrong similarity thresholds, rolling day counts instead of calendar weeks, GPT-4o doing finance math, no person queries, no fallback states). Rebuilt from scratch following the architecture spec §11–§13.

### `backend/app/services/query_classifier.py` — **NEW**
- `classify_query(question, user_timezone)` → `QueryClassification`
- Local keyword detection only — zero API calls, < 1ms
- Finance detection: keyword set + phrase matching ("how much", "what did I spend")
- Person detection: regex patterns + capitalisation heuristics, extracts `person_name`
- List query detection: "show me", "list", "all my" + type words → skip GPT-4o synthesis
- Type filter detection: maps keywords to entry types (journal, task, event, health, note, finance)
- Calendar-aware time windows in user's timezone → converted to UTC
  - "this week" = Monday midnight local → tomorrow midnight local (not 7 days rolling)
  - "last week" = previous Monday → this Monday
  - "this month" = 1st of month → tomorrow
- Similarity threshold: 0.5 for specific queries, 0.6 for broad

### `backend/app/services/retrieval_service.py` — **NEW**
- `retrieve(classification, question, user_id)` → `RetrievalResult`
- Four retrieval paths:
  - **PATH A** — Finance SQL: fetches ALL entries with `amount` in time window, computes `finance_total` in Python
  - **PATH B** — Vector search: `match_entries()` RPC with proper thresholds (0.5/0.6, not 0.85/0.95)
  - **PATH C** — Person SQL: queries `extracted_fields->>'person'` + `raw_text ILIKE` for person name
  - **PATH D** — Type+Date SQL: direct list queries, no vector search, no GPT-4o
- Smart path routing: list→D only, finance→A+B, person→C+B, else→B only
- Merge + deduplication by entry ID, SQL entries annotated with similarity from vector
- Finance fallback: if vector finds nothing, show all spending with honest explanation
- Semantic fallback: if vector returns nothing and time window exists, fall back to type+date SQL

### `backend/app/services/synthesis_service.py` — **NEW**
- `synthesize(question, retrieval, classification)` → `SynthesisResult`
- Single GPT-4o call with structured context (entry type, date, similarity confidence tags)
- Pre-computed `finance_total` passed as fact — GPT-4o uses it, does not recompute
- Fallback acknowledgement: "I couldn't find X specifically, but here's what I found"
- Confidence scoring based on similarity averages + fallback state
- List queries skip GPT-4o entirely (handled upstream)

### `backend/app/services/query_service.py` — **REWRITTEN**
- `query_entries(user_id, question, user_timezone)` → `QueryResponse`
- Wires classifier → retrieval → synthesis into a clean pipeline
- Accepts `user_timezone` parameter (was missing before)
- Returns enriched response: `answer`, `sources`, `has_data`, `fallback_triggered`, `finance_total`, `confidence`
- Empty results return honest message without GPT-4o call

### `backend/app/routers/query.py` — **REWRITTEN**
- `POST /api/query` now accepts `user_timezone` in request body
- Passes timezone through to `query_entries()`
- Returns full `QueryResponse` with fallback/confidence/finance_total fields

### `backend/app/routers/dev.py` — **UPDATED**
- `POST /api/dev/query` now passes `user_timezone="Asia/Kolkata"` for test user
- Updated to use new `QueryResponse` dataclass attributes (`.answer` not `["answer"]`)

### `backend/app/schemas/entry.py` — **UPDATED**
- `QueryRequest`: added `user_timezone` field (default "UTC")
- `QueryResponse`: added `fallback_triggered`, `finance_total`, `confidence` fields

### Bugs Fixed (from old implementation)
1. Similarity threshold 0.85/0.95 → 0.5/0.6 (cosine distance, lower is better)
2. "last week" = 14 days rolling → calendar Monday-to-Sunday in user's timezone
3. GPT-4o summing finance totals → pre-computed in Python
4. No person query path → SQL + vector hybrid for person names
5. No fallback state → honest fallback with broader data
6. GPT-4o on list queries → return entries directly
7. User timezone not flowing through → timezone passed from API → classifier → time windows

### `frontend/src/app/test/query/page.tsx` — **NEW**
- Standalone retrieval test page at `/test/query` (no auth, calls `/api/dev/query`)
- Text input with real-time query submission
- Answer display with confidence badge, fallback indicator, finance total
- Source entries displayed with similarity scores (strong/related/weak)
- Extracted fields and tags shown per source entry
- Quick test query buttons for all scenario types (finance, journal, person, list, task, health, fallback, semantic, empty)
- Query history table (last 10 queries, clickable to re-run)
- Link between ingestion (`/test`) and retrieval (`/test/query`) test pages

### `frontend/src/app/test/page.tsx` — **UPDATED**
- Added navigation link to retrieval test page in header

### `supabase/seed_retrieval_test.sql` — **NEW**
- 15 test entries covering all 7 entry types (5 finance, 2 journal, 2 task, 1 event, 2 note, 1 health, 1 PII)
- SQL-only — no embeddings (vector search won't work, SQL paths will)
- Idempotent: clears previous test entries before inserting

### `scripts/seed_retrieval.sh` — **NEW**
- Shell script that ingests 14 entries through `/api/dev/ingest`
- Each entry goes through the full pipeline (PII → extract → embed → insert)
- Entries get real embeddings — both SQL and vector search will work
- Requires backend running with `DEBUG=true`

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
