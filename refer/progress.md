# Progress Log

---

## March 14, 2026 — Profile Avatar with Logout

### `frontend/src/app/experiments/zen/page.tsx` — **UPDATED**

**New `ProfileAvatar` component:**
- Top-right corner of the chat panel (`absolute top-4 right-4 z-30`)
- Avatar image from **DiceBear `thumbs` collection** — `https://api.dicebear.com/9.x/thumbs/svg?seed=<name>`
- 15 named seeds: Felix, Aneka, Zephyr, Kira, Nova, Orion, Pico, Sage, Taro, Lumi, Blaze, Cleo, Drift, Echo, Frost
- `pickSeed(email)` hashes the user's email to a stable index — same account always gets the same character
- No package install — plain `<img>` tag fetches SVG from DiceBear CDN
- Click to open dropdown: larger avatar (40×40) + signed-in email + Sign out button
- Dropdown closes on outside click
- Logout: `supabase.auth.signOut()` → redirect to `/login`
- Styled to match chat UI: `rounded-full` button, `rounded-2xl` dropdown, `#faf9f6` hover

### Dependencies added to zen page
- `useRouter` from `next/navigation`
- `createClient` from `@/lib/supabase/client`
- `LogOut` icon from `lucide-react`

---

## March 14, 2026 — Waitlist Backend Endpoint + Resend Fix

### `backend/app/routers/waitlist.py` — **NEW**
- `POST /api/waitlist` — public endpoint, no auth required
- Accepts `{ email, message }` JSON body (email validated via Pydantic `EmailStr`)
- **Step 1:** upserts row into `waitlist` Supabase table (source of truth — never lost)
- **Step 2:** sends email notification via Resend REST API (best-effort, non-blocking)
- Uses `httpx.AsyncClient` for async HTTP to Resend
- Logs success/failure at each step; never returns error to user if email fails

### `backend/app/config.py` — **UPDATED**
- Added `resend_api_key: Optional[str]` and `waitlist_notify_email: Optional[str]`

### `backend/app/main.py` — **UPDATED**
- Registered `waitlist.router` (always mounted, not debug-only — it's a public endpoint)

### `backend/.env.example` — **UPDATED**
- Added `RESEND_API_KEY` and `WAITLIST_NOTIFY_EMAIL`

### `supabase/migrations/006_create_waitlist.sql` — **NEW**
- Creates `waitlist` table: `id`, `email` (unique), `message`, `created_at`
- RLS: public INSERT allowed, SELECT blocked (view via Supabase dashboard only)

### `frontend/src/app/(auth)/signup/page.tsx` — **UPDATED**
- Request Access button now calls `POST $NEXT_PUBLIC_API_URL/api/waitlist` (backend)
- Was calling Next.js `/api/request-access` route (frontend-only, now unused)

### `frontend/src/app/api/request-access/route.ts` — now unused
- Can be deleted; signup page no longer calls it

### Resend sender fix
- Changed `from` address from `noreply@heypoco.com` (unverified domain, silently rejected) to `onboarding@resend.dev` (Resend shared sender, works without domain verification)
- Limitation: Resend test mode only delivers to the account owner's verified email; all waitlist entries are stored in DB regardless

### Add to `backend/.env`:
```
RESEND_API_KEY=re_your_key
WAITLIST_NOTIFY_EMAIL=kshitijdumbreprojects@gmail.com
```

---

## March 14, 2026 — Rich Cards: TravelCard + Expense Split + Query List Rendering

### `frontend/src/app/experiments/zen/page.tsx` — **UPDATED**

**New TravelCard:**
- Detects travel entries via keywords in `raw_text` (travel, flight, trip, fly, drive, train, etc.)
- Extracts "City A → City B" route using regex on raw_text / extracted_fields.title
- Shows pink Plane icon, FROM/TO cities large, departure time below
- Falls back to plain label + time if route can't be parsed
- Category pill: `TRAVEL` (pink `#ec4899`)

**Expense split detection:**
- Detects "split"/"shared"/"between" in raw_text + `person` in extracted_fields
- Card redesigned to match landing page: dark `#1a1a1a` panel with "YOU PAID $X" + "Person owes you $Y" in green
- Split amount = total ÷ 2 (backend limitation: people count not extracted)

**Query list rendering fixed:**
- `queryToRichData()` previously returned `undefined` for all non-finance queries → plain text only
- Now maps `sources` array to cards based on first entry's type:
  - `event` / `task` sources → ScheduleCard with all items listed
  - `journal` sources → JournalCard with highlights
  - Everything else → NoteCard with bullet list of raw_text previews

---

## March 14, 2026 — Auth Protection, Request Access Flow, /chat Route

### `/chat` route
- Created `frontend/src/app/chat/page.tsx` that re-exports from `experiments/zen/page.tsx`
- `/experiments/zen` still works; all edits go to the zen file and reflect at `/chat`

### `frontend/src/middleware.ts` — **NEW**
- Protects all routes except `/`, `/login`, `/signup`
- Uses Supabase SSR session check on every request
- Unauthenticated requests redirected to `/login?next=<original-path>`
- Login page reads `?next` param and sends user back to where they were going

### `frontend/src/app/(auth)/login/page.tsx` — **UPDATED**
- After successful login → redirect to `/chat` (was `/dashboard`)
- Reads `?next` search param so deep links work after redirect

### `frontend/src/app/(auth)/signup/page.tsx` — **REWRITTEN**
- Replaced real Supabase signup with "Request Access" waitlist form
- Fields: email (required) + message/reason (optional)
- On submit → `POST /api/request-access` → email notification sent to owner
- Success state: checkmark + "You're on the list" confirmation

### `frontend/src/app/api/request-access/route.ts` — **NEW**
- Next.js API route handling waitlist submissions
- Sends notification email via Resend API (`RESEND_API_KEY`)
- Destination address from `WAITLIST_NOTIFY_EMAIL` env var
- Graceful fallback: if env vars missing, logs to console and returns 200 (never blocks user)

### `frontend/.env.local.example` — **UPDATED**
- Added `WAITLIST_NOTIFY_EMAIL=you@example.com`
- Added `RESEND_API_KEY=re_xxxxxxxx`

### Setup required
1. Add to `frontend/.env.local`:
   ```
   WAITLIST_NOTIFY_EMAIL=your@email.com
   RESEND_API_KEY=re_your_key_here
   ```
2. Sign up at resend.com, verify your sending domain (or use their sandbox for testing)

---

## March 14, 2026 — Query "Tomorrow" + Event vs Task Classification Fix

### Root cause
Querying "Can you please list all tomorrow's events?" returned "Nothing in your logs matches that yet." even when events were logged.

Two bugs identified:

**Bug 1 — Travel entries classified as `task` instead of `event`**
- "I'm traveling from Phoenix to San Francisco tomorrow" → GPT-4o returned `type: task`
- Querying for events then finds nothing
- Fix: added explicit rule to extraction prompt distinguishing task vs event:
  - `event` = scheduled occurrences (travel, trips, meetings, flights, parties)
  - `task` = actionable to-dos (buy, send, fix, remind)
  - Also: event must populate `title`, `scheduled_at`, `people`

**Bug 2 — `"tomorrow"` not recognized as a time filter in queries**
- `_TIME_PHRASES` in `query_classifier.py` had no entry for "tomorrow" or "next week"
- Query fell through to `all_time` (no date filter) and vector search returned nothing
- Fix: added `"tomorrow"` and `"next week"` to `_TIME_PHRASES` + `_build_time_window()`
  - `tomorrow` → today+1 to today+2 (calendar day in user's timezone, converted to UTC)
  - `next_week` → next Monday to following Sunday

### Files changed
- `backend/app/services/query_classifier.py` — added `tomorrow` + `next_week` time phrases and window builder cases
- `backend/app/services/extraction_service.py` — added event-vs-task classification rule to GPT-4o prompt

---

## March 14, 2026 — Rich Cards Expanded + Journal & Health Fixes

### `frontend/src/app/experiments/zen/page.tsx` — **UPDATED**

**6 card types now live (was 3):**

| Card | Backend type | Trigger |
|---|---|---|
| `ExpenseCard` | `finance` | "Spent $42 at Starbucks" |
| `SummaryCard` | query + `finance_total > 0` | "How much did I spend this week?" |
| `ScheduleCard` | `task` / `event` | "Remind me to call Mom tomorrow at 7pm" |
| `HealthCard` | `health` | "I walked 10,000 steps today" |
| `NoteCard` | `note` / `general` | "Coffee with Anirudh to discuss the project" |
| `JournalCard` | `journal` | "Feeling great, completed Poco setup and started LeetCode" |

**Card design upgraded** to match landing page (`/experiments/components`) visual language — rounded-3xl, icon header with category label, consistent spacing.

**Bug fixes found during testing:**

- **Health card showed fallback** — backend `ExtractedFields` has no `steps`/`sleep` fields. Fixed by parsing them from `raw_text` with regex (`\d+ steps`, `slept \d+h`)
- **Schedule time showed raw ISO** (`2026-03-14T00:00:00-07:00`) — added `formatTime()` helper that converts ISO to locale string (`Sat, Mar 14, 12:00 AM`)
- **Journal card showed full raw_text** including meta-phrases like "I want to journal the thing" — fixed to use `highlights` from extracted_fields first, then `notes`/`topic`, never raw_text
- **Journal mood not shown** — card now shows mood as emoji (😊/😔/😐) top-right; falls back to "Saved to journal." when highlights are empty

### `backend/app/services/extraction_service.py` — **UPDATED**
- Added two journal-specific rules to the GPT-4o extraction prompt:
  - Always populate `highlights` with 1–3 key things mentioned, stripping meta-phrases ("I want to journal", "just logging", etc.)
  - Always infer `mood` (positive/negative/neutral) from tone for journal entries

---

## March 14, 2026 — Frontend Chat UI Connected to Backend + Voice UX Fixes

Replaced all mock data in the Zen chat UI (`/experiments/zen`) with real end-to-end API calls, then fixed two bugs found during testing: query routing not working for voice input, and no auto-stop on silence.

### `frontend/src/app/experiments/zen/page.tsx` — **REWRITTEN (×2)**

**Session 1 — Backend connection:**
- Removed all mock arrays (`MOCK_VOICE_LOGS`, `TEXT_REPLIES`, `getTextReply`) — ~150 lines of mock logic deleted
- **Text flow**: `isQuery()` helper detects query vs log intent (question words + `?` suffix)
  - Query → `POST /api/query` with `user_timezone`
  - Log → `POST /api/ingest` with `raw_text` + `user_timezone`
- **Voice flow**: replaced simulated 3.5s timeout with real MediaRecorder via `useVoiceRecorder` hook
  - `startRecording()` → captures WebM audio
  - `stopRecording()` → blob → `POST /api/ingest` with `audio_file`
  - Transcribed `raw_text` from response shown as user bubble
- **Rich card mapping** from real backend responses:
  - `finance` → `ExpenseCard` (amount + merchant from `extracted_fields`)
  - `task` / `event` → `ScheduleCard` (action/title + scheduled_at/deadline)
  - Query with `finance_total` → `SummaryCard` (total + per-merchant breakdown from sources)
  - All other entries → plain text bubble with category pill
- **Error state**: red-tinted bubble on API failure (auth, network, 5xx)
- Auth via `api-client.ts` → Supabase session → `Authorization: Bearer` header
- `user_timezone` = `Intl.DateTimeFormat().resolvedOptions().timeZone` on every call

**Session 2 — Two bugs fixed:**

**Bug 1 — Voice queries always ingested instead of queried:**
- Root cause: voice path called `ingestEntry(blob)` directly — never ran `isQuery()` on the transcript
- Fix: two-step voice pipeline — `transcribeAudio(blob)` first → show transcript as user bubble → `isQuery()` → route to `queryEntries` or `ingestEntry`
- Also strengthened `isQuery()`: any text ending with `?` now routes to query, not just specific prefix patterns

**Bug 2 — No silence detection, mic required manual stop:**
- Replaced `useVoiceRecorder` hook with inline recording + `AudioContext` analyser loop
- `AnalyserNode` computes RMS every animation frame; if RMS < `0.01` for 2.5s → auto-calls `stopAndProcess()`
- Sound detected mid-silence resets the timer (debounce pattern)
- Waveform bars now driven by live mic volume (4px quiet → 24px loud) instead of CSS animation

### `frontend/src/types/index.ts` — **UPDATED**
- `QueryRequest`: added `user_timezone?: string` to match backend schema
- `QueryResponse`: added `fallback_triggered`, `finance_total`, `confidence` fields to match `QueryResponse` dataclass in `backend/app/schemas/entry.py`

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
