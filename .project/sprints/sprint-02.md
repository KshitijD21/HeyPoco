# Sprint 02 — Product Hardening & Chat UI

**Goal:** Wire the frontend to the real backend, harden auth, build production-ready chat UI with rich cards, and ship the waitlist flow end-to-end.

**Start Date:** 2026-03-01
**End Date:** 2026-03-14
**Status:** ✅ Complete

---

## Tasks

### Ingestion Pipeline
- [x] Build `pii_service.py` — local regex PII detection (SSN, credit card, Aadhaar, PAN, IFSC, passport, phone, email), returns redacted text + PII types, zero API calls
- [x] Build `extraction_service.py` — GPT-4o single call, classifies 7 entry types (finance, journal, task, event, note, health, general), resolves relative dates, extracts domain-specific fields, generates 2–4 tags
- [x] Build `POST /api/ingest` — full pipeline: transcribe → PII → extract → embed → INSERT, handles audio and text, falls back to `type=general` on extraction failure
- [x] Fix event vs task classification in GPT-4o prompt — travel/meetings/flights → `event`; buy/send/fix → `task`

### Retrieval Pipeline (full rebuild)
- [x] Build `query_classifier.py` — zero-API keyword classifier with finance detection, person detection, list query detection, type filter, calendar-aware time windows in user timezone
- [x] Add `tomorrow` and `next week` time phrases to classifier
- [x] Build `retrieval_service.py` — 4 paths: finance SQL (PATH A), vector search (PATH B), person SQL (PATH C), type+date SQL (PATH D); smart routing, merge + dedup
- [x] Build `synthesis_service.py` — GPT-4o with structured context, pre-computed finance totals, fallback acknowledgement, confidence scoring
- [x] Rewrite `query_service.py` — clean classifier → retrieval → synthesis pipeline, user timezone flowing through
- [x] Rewrite `POST /api/query` — accepts `user_timezone`, returns full `QueryResponse` with `fallback_triggered`, `finance_total`, `confidence`
- [x] Add `user_timezone` to `QueryRequest` and `QueryResponse` schemas

### Chat UI (`/experiments/zen` → `/chat`)
- [x] Replace all mock data with real API calls (`ingestEntry`, `queryEntries`, `transcribeAudio`)
- [x] Implement `isQuery()` helper — routes text to ingest vs query
- [x] Voice pipeline: `MediaRecorder` → transcribe → route to ingest or query
- [x] Silence detection: `AudioContext` analyser, auto-stop after 2.5s of silence, live waveform bars
- [x] Rich card system: `ExpenseCard`, `SummaryCard`, `ScheduleCard`, `TaskCard`, `TravelCard`, `HealthCard`, `NoteCard`, `JournalCard`
- [x] `TaskCard` — red dot list matching component library style, parses tasks from comma/semicolon-separated text
- [x] `TravelCard` — FROM → TO route with Plane icon, multi-word city support (e.g. "New York")
- [x] `ExpenseCard` — dark panel, split bill support
- [x] Fix travel detection — only triggers on `event` type + unambiguous travel words + route pattern; tasks never show TravelCard
- [x] Create `/chat` route — re-exports from `experiments/zen/page.tsx`

### Auth & Security
- [x] Create `frontend/src/middleware.ts` — protects all routes except `/`, `/login`, `/signup`; uses `getUser()` (server-validates token, not just cookie)
- [x] Fix middleware cookie API — updated to `getAll`/`setAll` (current `@supabase/ssr` v0.8 API)
- [x] Client-side auth guard in `ZenModePage` — `getUser()` check on mount, hard redirect to `/login` if no session; all hooks declared before early return (Rules of Hooks fix)
- [x] Login page — redirects to `/chat` after success, reads `?next` param for deep links
- [x] Signup page — rewritten as "Request Access" waitlist form

### Waitlist
- [x] Build `POST /api/waitlist` (FastAPI) — upserts to `waitlist` table, best-effort Resend email notification via `httpx.AsyncClient`
- [x] Fix Resend sender — changed from `noreply@heypoco.com` (unverified) to `onboarding@resend.dev`
- [x] Add `email-validator` to `requirements.txt` (required by Pydantic `EmailStr`)
- [x] Create `supabase/migrations/006_create_waitlist.sql` — `waitlist` table with RLS (public INSERT, SELECT blocked)
- [x] Wire landing page `EarlyAccessModal` to call `POST /api/waitlist` (was `console.log` only)
- [x] Add "Already have access? Sign in" button to `EarlyAccessModal`

### Profile Avatar
- [x] `ProfileAvatar` component — top-right of chat panel, DiceBear `thumbs` style via CDN
- [x] 15 named seeds (Felix, Aneka, Zephyr, Kira, Nova, Orion, Pico, Sage, Taro, Lumi, Blaze, Cleo, Drift, Echo, Frost) — email hashed to stable index
- [x] Dropdown: larger avatar + signed-in email + Sign out button
- [x] Logout: `supabase.auth.signOut()` + `window.location.href = '/login'` (hard redirect so middleware re-evaluates cleared cookies)

### Dev & Tooling
- [x] Build `backend/app/routers/dev.py` — `POST /api/dev/ingest`, `GET /api/dev/health`, no auth, only mounted when `DEBUG=true`
- [x] Build `/test` frontend dev page — mic + text input, pipeline status, result display, session history
- [x] Build `/test/query` frontend dev page — query tester with confidence badge, source entries, quick test buttons
- [x] Create `refer/stack.md` — full product + stack documentation (frontend, backend, DB, hosting guide)
- [x] Add `refer/` to `.gitignore` — internal dev notes not pushed to repo
- [x] Add `supabase_status.json`, `supabase_status.txt`, `test_audio.wav` to `.gitignore`

---

## Notes
- Full end-to-end pipeline live: voice → Whisper → PII → GPT-4o → pgvector → query → GPT-4o → rich card UI
- Auth is double-protected: server middleware (`getUser`) + client-side guard in the page component
- Rich card types now match the component library visual language
- Waitlist stored in DB regardless of email success — source of truth is always Supabase

---

## Folders/Files Safe to Delete

These can be removed manually — they are no longer needed:

| Path | Reason |
|---|---|
| `Voice Logging Interface/` | Old Vite prototype, superseded by Next.js frontend |
| `HeyPoco Docs/` | Old markdown docs, superseded by `refer/stack.md` and `.project/` |
| `supabase_status.json` | Scratch file, now gitignored |
| `supabase_status.txt` | Scratch file, now gitignored |
| `test_audio.wav` | Test file, now gitignored |
| `frontend/src/app/api/request-access/route.ts` | Old Next.js waitlist route, replaced by backend `/api/waitlist` |
