# HeyPoco — Architecture Decision Records

Lightweight ADRs documenting key technical decisions.

---

## ADR-001: Separate Frontend + Backend

**Date:** 2026-02-22
**Status:** Accepted

**Context:** HeyPoco requires heavy AI processing (Whisper, GPT-4o, embeddings). A monolithic Next.js app with API routes would work but couples UI and AI logic.

**Decision:** Separate into FastAPI (Python) backend + Next.js 14 (TypeScript) frontend.

**Rationale:**
- Python is the natural ecosystem for AI/ML workloads
- Independent scaling — backend can handle async AI tasks separately
- Clearer separation of concerns
- Backend can serve future mobile clients without changes

---

## ADR-002: Supabase over Custom Auth + DB

**Date:** 2026-02-22
**Status:** Accepted

**Context:** Need auth, PostgreSQL, storage, and real-time — don't want to build from scratch for a POC.

**Decision:** Use Supabase as the backend-as-a-service layer.

**Rationale:**
- Built-in auth with JWT
- PostgreSQL with RLS for data isolation
- pgvector extension for embeddings
- Storage for future attachments
- Generous free tier for POC

---

## ADR-003: React Query + Zustand Split

**Date:** 2026-02-22
**Status:** Accepted

**Context:** Need both server state (entries, queries) and client UI state (recording, filters).

**Decision:** React Query for server state, Zustand for client state.

**Rationale:**
- React Query handles caching, refetching, optimistic updates out of the box
- Zustand is minimal and fast for UI-only state
- Avoids Redux complexity
- Clear mental model: "if it comes from the server → React Query; if it's UI-only → Zustand"
