# HeyPoco — Complete Architecture & Engineering Reference

**Version:** 2.1  
**Date:** March 2026  
**Status:** Active — MVP Build

---

## 1. What HeyPoco Is

A voice-first personal brain dump app. The user speaks anything. The app stores it intelligently. The user retrieves it later with natural language.

**Core contract:**
```
User dumps anything → System understands + stores → User retrieves anytime
```

**Three product principles:**
- Relief, not obligation
- Honest, not optimistic
- Effortless, not impressive

**What it is not:** A reminder app. An AI assistant. A budgeting tool. A task manager.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python) |
| Frontend | Next.js 14 (App Router) |
| Database | Supabase (Postgres + pgvector) |
| Transcription | OpenAI Whisper |
| Extraction | OpenAI GPT-4o |
| Embeddings | OpenAI text-embedding-3-small (1536 dims) |
| Storage | Supabase Storage (files, audio) |
| Auth | Supabase Auth |

---

## 3. Database Design Principles

- **Raw text is the source of truth** — `raw_text` is always stored exactly as spoken/typed, never modified after creation
- **JSONB over columns** — extracted fields are flexible JSONB, not rigid columns. Unknown places like "Zigle's" and new field types don't require schema changes
- **Embeddings enable semantic search** — OpenAI `text-embedding-3-small` (1536 dims) on `raw_text` at ingest time. This is what lets "coffee" queries surface "Starbucks" and "Zigle's" entries
- **Soft typing** — `type` is a rough label (finance, event, etc.), not a hard constraint. The LLM reasons over embeddings at query time, not types
- **RLS at the database layer** — user isolation enforced in Postgres, not just application code
- **Never let extraction failure block storage** — store raw text first, extraction is a best-effort overlay

---

## 4. Database Schema

### 4.1 profiles

```sql
CREATE TABLE public.profiles (
    id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email        TEXT,
    display_name TEXT,
    timezone     TEXT NOT NULL DEFAULT 'UTC',  -- CRITICAL for time-based queries
    created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS: users can only see their own profile
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can only see own profile"
    ON public.profiles FOR ALL
    USING (auth.uid() = id);

-- Auto-create profile on Supabase signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.profiles(id, email)
    VALUES (new.id, new.email);
    RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE handle_new_user();
```

**Why timezone matters:** "Today I spent $60" logged at 11pm IST is Feb 25 for the user but Feb 24 in UTC. Without timezone, entry_date is wrong by one day and time-based queries break.

---

### 4.2 entries — Core Table

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE public.entries (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Input source
    source           TEXT        NOT NULL DEFAULT 'voice'
                                 CHECK (source IN ('voice', 'text')),

    -- Content — raw_text NEVER modified after creation
    raw_text         TEXT        NOT NULL,

    -- Free text type — NO CHECK constraint
    -- finance | journal | task | event | note | health | general
    -- Add new domains by updating extraction prompt only, zero migrations
    type             TEXT        NOT NULL DEFAULT 'general',

    -- All domain-specific fields live here
    -- See Section 4 for full JSONB contract per type
    extracted_fields JSONB       NOT NULL DEFAULT '{}',

    -- Short labels for display and filtering
    tags             TEXT[]      NOT NULL DEFAULT '{}',

    -- When it HAPPENED vs when it was LOGGED — always different
    -- "Yesterday I spent $60" → entry_date=yesterday, created_at=today
    entry_date       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Security — PII entries never embedded, never in search results
    is_sensitive     BOOLEAN     DEFAULT FALSE,
    pii_types        TEXT[],

    -- Semantic search vector
    -- NULL for sensitive entries — never send PII to embedding API
    embedding        VECTOR(1536),

    -- Generated columns — fast time queries, zero app-level date math
    day_date    DATE GENERATED ALWAYS AS (entry_date::date) STORED,
    week_number INT  GENERATED ALWAYS AS (EXTRACT(week  FROM entry_date)::int) STORED,
    year_number INT  GENERATED ALWAYS AS (EXTRACT(year  FROM entry_date)::int) STORED
);

-- RLS
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can only see own entries"
    ON public.entries FOR ALL
    USING (auth.uid() = user_id);
```

---

### 4.3 weekly_summaries (Post-MVP)

```sql
CREATE TABLE public.weekly_summaries (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    year_number  INT  NOT NULL,
    week_number  INT  NOT NULL,
    week_start   DATE NOT NULL,
    week_end     DATE NOT NULL,
    summary_text TEXT NOT NULL,
    stats        JSONB NOT NULL DEFAULT '{}',
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, year_number, week_number)
);

ALTER TABLE public.weekly_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can only see own summaries"
    ON public.weekly_summaries FOR ALL
    USING (auth.uid() = user_id);
```

---

### 4.4 Indexes

```sql
-- Dominant query: user + time
CREATE INDEX idx_entries_user_date
    ON public.entries(user_id, entry_date DESC);

-- Type filtering: journals this week, finance this month
CREATE INDEX idx_entries_user_type
    ON public.entries(user_id, type, entry_date DESC);

-- Daily feed
CREATE INDEX idx_entries_day
    ON public.entries(user_id, day_date);

-- Weekly summary generation
CREATE INDEX idx_entries_week
    ON public.entries(user_id, year_number, week_number);

-- Finance fallback: all entries with an amount
CREATE INDEX idx_entries_amount
    ON public.entries((extracted_fields->>'amount'))
    WHERE extracted_fields ? 'amount';

-- JSONB fast lookup
CREATE INDEX idx_entries_tags
    ON public.entries USING GIN(tags);

CREATE INDEX idx_entries_fields
    ON public.entries USING GIN(extracted_fields);

-- Non-sensitive entries only (excludes PII from search)
CREATE INDEX idx_entries_public
    ON public.entries(user_id, type, entry_date)
    WHERE is_sensitive = FALSE;

-- Vector search — HNSW is faster than IVFFlat at your scale
CREATE INDEX idx_entries_embedding
    ON public.entries USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
```

---

### 4.5 match_entries() — Vector Search Function

```sql
CREATE OR REPLACE FUNCTION match_entries(
    query_embedding      VECTOR(1536),
    match_user_id        UUID,
    match_count          INT   DEFAULT 10,
    similarity_threshold FLOAT DEFAULT 0.6,
    type_filter          TEXT  DEFAULT NULL,
    date_from            TIMESTAMPTZ DEFAULT NULL,
    date_to              TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    id               UUID,
    type             TEXT,
    raw_text         TEXT,
    extracted_fields JSONB,
    tags             TEXT[],
    entry_date       TIMESTAMPTZ,
    similarity       FLOAT
)
LANGUAGE sql STABLE AS $$
    SELECT
        e.id,
        e.type,
        e.raw_text,
        e.extracted_fields,
        e.tags,
        e.entry_date,
        (e.embedding <=> query_embedding) AS similarity
    FROM public.entries e
    WHERE e.user_id = match_user_id
      AND e.embedding IS NOT NULL
      AND e.is_sensitive = FALSE          -- PII entries never returned
      AND (e.embedding <=> query_embedding) <= similarity_threshold
      AND (type_filter IS NULL OR e.type = type_filter)
      AND (date_from IS NULL OR e.entry_date >= date_from)
      AND (date_to IS NULL OR e.entry_date <= date_to)
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
$$;
```

**Similarity thresholds:**

| Score | Meaning | Action |
|---|---|---|
| `< 0.3` | Strong match | Answer directly |
| `0.3 – 0.6` | Related match | Cite as possibly related |
| `> 0.6` | Weak match | Exclude |

---

## 5. extracted_fields JSONB Contract

Same column, different keys per type. No schema migration needed to add new domains.

### finance
```jsonc
{
  "amount": 60,
  "currency": "USD",
  "merchant": "Starbucks",
  "category": "food & drink",
  "breakdown": [                          // for multi-merchant entries
    {"merchant": "Starbucks", "amount": 60, "category": "food & drink"},
    {"merchant": "H&M", "amount": 20, "category": "shopping"}
  ]
}
```

### journal
```jsonc
{
  "mood": "positive",
  "energy": "high",
  "highlights": ["finished HeyPoco backend", "call with mom"],
  "people": ["mom"]
}
```

### task
```jsonc
{
  "action": "send the contract to Sarah",
  "person": "Sarah",
  "deadline": "2026-02-28",
  "status": "open"
}
```

### event
```jsonc
{
  "title": "Dentist appointment",
  "scheduled_at": "2026-02-26T15:00:00",
  "location": null,
  "duration_minutes": null,
  "reminder": true
}
```

### note
```jsonc
{
  "topic": "product idea",
  "project": "HeyPoco",
  "person": "Ahmed"
}
```

### health
```jsonc
{
  "symptom": "headache",
  "medication": "paracetamol",
  "severity": null,
  "time": "10:00"
}
```

---

## 6. Entry Type Examples

| User Says | type | Key extracted_fields | Vector Finds It When |
|---|---|---|---|
| "Spent $60 at Starbucks" | finance | amount:60, merchant:Starbucks, category:food & drink | "coffee spend", "food this week" |
| "Today was great, felt focused" | journal | mood:positive, energy:high | "when did I feel productive" |
| "Send contract to Sarah by Friday" | task | action, person:Sarah, deadline | "open tasks", "what do I owe Sarah" |
| "Dentist tomorrow at 3pm" | event | title, scheduled_at | "appointments this week", "tomorrow" |
| "Ahmed is moving to Dubai" | note | person:Ahmed, topic:life update | "what is Ahmed up to" |
| "Headache all morning, took paracetamol" | health | symptom, medication | "when did I have headache" |

---

## 7. PII Detection

### What is PII?
Personally Identifiable Information — sensitive data that can identify or harm someone if exposed to external APIs.

### Why it matters
Your pipeline sends data to OpenAI (Whisper + GPT-4o). Without PII detection, a user saying "my SSN is 123-45-6789" sends that SSN to OpenAI's servers in plaintext.

### Normal flow vs PII-protected flow

**Without PII detection:**
```
User says: "My SSN is 123-45-6789"
      ↓
Whisper → "My SSN is 123-45-6789"     ← SSN exposed to OpenAI
      ↓
GPT-4o receives real SSN              ← exposed again
      ↓
Embedding model receives real SSN     ← exposed third time
      ↓
Stored as plain text in database      ← unprotected
```

**With PII detection:**
```
User says: "My SSN is 123-45-6789"
      ↓
Whisper → "My SSN is 123-45-6789"
      ↓
detect_pii() runs LOCALLY — no API call
  clean_text: "My SSN is [SSN_REDACTED]"
  has_pii: true
  pii_types: ["ssn"]
      ↓
GPT-4o receives: "My SSN is [SSN_REDACTED]"  ← safe
      ↓
Embedding: null                               ← never embedded
      ↓
Database: raw_text encrypted, is_sensitive=true
      ↓
Weekly summary: entry skipped entirely
      ↓
User retrieves: requires biometric confirmation
```

### detect_pii() function

```python
import re

PII_PATTERNS = {
    # US
    "ssn":         r'\b\d{3}-\d{2}-\d{4}\b',
    "credit_card": r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b',
    # Indian
    "aadhaar":     r'\b\d{4}\s\d{4}\s\d{4}\b',
    "pan":         r'\b[A-Z]{5}\d{4}[A-Z]\b',
    "ifsc":        r'\b[A-Z]{4}0[A-Z0-9]{6}\b',
    # Universal
    "passport":    r'\b[A-Z]{1,2}\d{6,9}\b',
    "phone":       r'\b(\+\d{1,3}[\s-])?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b',
    "email":       r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b',
}

REDACTION_MAP = {
    "ssn":         "[SSN_REDACTED]",
    "credit_card": "[CARD_REDACTED]",
    "aadhaar":     "[AADHAAR_REDACTED]",
    "pan":         "[PAN_REDACTED]",
    "ifsc":        "[IFSC_REDACTED]",
    "passport":    "[PASSPORT_REDACTED]",
    "phone":       "[PHONE_REDACTED]",
    "email":       "[EMAIL_REDACTED]",
}

def detect_pii(raw_text: str) -> dict:
    clean_text = raw_text
    found_types = []

    for pii_type, pattern in PII_PATTERNS.items():
        if re.search(pattern, clean_text, re.IGNORECASE):
            found_types.append(pii_type)
            clean_text = re.sub(
                pattern,
                REDACTION_MAP[pii_type],
                clean_text,
                flags=re.IGNORECASE
            )

    return {
        "clean_text": clean_text,
        "has_pii": len(found_types) > 0,
        "pii_types": found_types
    }
```

**Example outputs:**
```python
detect_pii("My SSN is 123-45-6789")
# {"clean_text": "My SSN is [SSN_REDACTED]", "has_pii": True, "pii_types": ["ssn"]}

detect_pii("Today I spent $60 at Starbucks")
# {"clean_text": "Today I spent $60 at Starbucks", "has_pii": False, "pii_types": []}

detect_pii("Call me at +91 98765 43210, my PAN is ABCDE1234F")
# {"clean_text": "Call me at [PHONE_REDACTED], my PAN is [PAN_REDACTED]",
#  "has_pii": True, "pii_types": ["phone", "pan"]}
```

---

## 8. Row Level Security — Explained

### Without RLS
```
Your database has 1000 users.
A bug in your code passes the wrong user_id.
One user reads another user's private journals, expenses, SSN.
You never know it happened.
```

### With RLS
```sql
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can only see own entries"
    ON public.entries FOR ALL
    USING (auth.uid() = user_id);
```

Postgres itself enforces `AND user_id = auth.uid()` on every single query. Not your Python code. Not your FastAPI middleware. The database engine itself. Even if your application has a bug, the database blocks it.

```
Without RLS: Bug → wrong user_id → other user's data exposed
With RLS:    Bug → wrong user_id → Postgres blocks → zero rows returned
```

Think of it as: your application code is a security guard at the door. RLS is a lock on every individual room. Even if the guard makes a mistake, the lock holds.

---

## 9. GPT-4o Extraction Prompt

Called once per entry at ingest. Identifies type, category, and extracts structured fields.

```python
EXTRACTION_PROMPT = """
You are processing a personal voice log entry for a brain dump app.
Today's date: {current_date}
User timezone: {timezone}

Analyze this entry and return JSON only. No explanation. No markdown.

Input: "{raw_text}"

Return exactly this structure:
{{
  "type": "finance | journal | task | event | note | health | general",
  "entry_date": "ISO 8601 datetime — infer from today/yesterday/tomorrow/last week",
  "extracted_fields": {{
    "amount":       number or null,
    "currency":     "USD | INR | EUR | GBP | AED" or null,
    "merchant":     string or null,
    "category":     "food & drink | shopping | transport | health | entertainment | utilities | other" or null,
    "breakdown":    [] or null,
    "mood":         "positive | negative | neutral" or null,
    "energy":       "high | low | medium" or null,
    "highlights":   [] or null,
    "action":       string or null,
    "deadline":     "ISO date" or null,
    "status":       "open" or null,
    "title":        string or null,
    "scheduled_at": "ISO datetime" or null,
    "person":       string or null,
    "people":       [] or null,
    "symptom":      string or null,
    "medication":   string or null,
    "topic":        string or null
  }},
  "tags": ["2-4 short lowercase tags"]
}}

Rules:
- Return only fields relevant to the type. Omit irrelevant fields entirely.
- Never fabricate data not present in the input.
- If type is unclear, use general.
- For amounts: extract all numbers that represent money.
- For dates: resolve relative terms using today's date provided above.
"""
```

---

## 10. Full Ingestion Flow

### Your side (ingestion)

```
User speaks
      ↓
[STEP 1] transcribe(audio_file) → raw_text          ✓ BUILT
  • OpenAI Whisper API
  • Input: audio file
  • Output: plain string

      ↓
[STEP 2] detect_pii(raw_text) → {clean_text, has_pii, pii_types}
  • Local regex — NO API call
  • Runs before anything external sees the text
  • If has_pii: set is_sensitive=true, skip embedding later

      ↓
[STEP 3] extract(clean_text, current_date, timezone)
  → {type, entry_date, extracted_fields, tags}
  • One GPT-4o call
  • Identifies type and extracts structured fields
  • Uses clean_text (PII already redacted)

      ↓
[STEP 4] embed(raw_text) → vector[1536]              ✓ BUILT
  • text-embedding-3-small
  • SKIP if is_sensitive = true
  • Shared function with retrieval side

      ↓
[STEP 5] INSERT into entries
  raw_text:         original verbatim
  type:             from extraction
  extracted_fields: from extraction
  tags:             from extraction
  entry_date:       from extraction
  embedding:        from embed() or null if sensitive
  is_sensitive:     from detect_pii()
  pii_types:        from detect_pii()
  source:           "voice" or "text"
  user_id:          from auth token

      ↓
Return confirmation to user
```

### Costs per entry

| Step | Cost |
|---|---|
| Whisper (10s clip) | ~$0.001 |
| detect_pii (local) | $0.000 |
| GPT-4o extraction | ~$0.030 |
| text-embedding-3-small | ~$0.000002 |
| **Total per entry** | **~$0.031** |

At 10 logs/day per user, 100 users: ~$93/month in AI costs.

---

## 11. Full Retrieval Flow

### Your friend's side (retrieval)

```
User asks: "How much did I spend this week?"
      ↓
[STEP 1] classify_query(question)
  • Local keyword detection — no API
  • Detects: is_finance, is_person, time_range, topic
  • Output: {type: "finance", time_range: "this_week", is_aggregation: true}

      ↓
[STEP 2] embed(question) → vector[1536]
  • Same embed() function built by you
  • Shared import

      ↓
[STEP 3] Retrieve — two paths based on query type

  PATH A — SQL (finance aggregation, always complete):
    SELECT raw_text, extracted_fields->>'amount', entry_date
    FROM entries
    WHERE user_id = ?
      AND extracted_fields ? 'amount'
      AND year_number = 2026
      AND week_number = 8
    ORDER BY entry_date DESC;
    → returns ALL 47 expense entries, not just top 10

  PATH B — Vector search (semantic queries):
    match_entries(query_embedding, user_id, threshold=0.6)
    → returns entries by meaning similarity

  BOTH paths run for mixed queries.
  SQL gives completeness. Vector gives relevance signal.

      ↓
[STEP 4] Merge results
  • Deduplicate by entry id
  • Annotate SQL results with similarity score where available
  • Entries with no similarity score = found by SQL only

      ↓
[STEP 5] synthesize(question, entries[]) → answer_text
  • One GPT-4o call
  • Receives all retrieved entries + similarity scores
  • Reasons over real evidence only
  • Returns: answer + confidence level

      ↓
Return to user:
  {
    "answer": "This week you spent $347 total...",
    "sources": [...entries used],
    "fallback": false
  }
```

---

## 12. Retrieval Scenarios

### Scenario A — Finance query with fallback

```
User: "How much did I spend on shopping?"
      ↓
Vector search for "shopping" → nothing found (similarity > 0.6)
      ↓
Fallback triggers
      ↓
SQL: get ALL entries with amount this month
      ↓
Return:
"I couldn't find anything specifically tagged as shopping.
 Here is everything you spent this month:
 - H&M $50
 - Starbucks $60
 - Lunch $30
 Total: $140"
```

User sees H&M in the list and knows. You do not guess. You do not fabricate.

### Scenario B — Semantic query

```
User: "When did I last feel really productive?"
      ↓
embed("when did I last feel really productive")
      ↓
match_entries() finds:
  "Today was great, felt focused, finished HeyPoco backend"
  similarity: 0.21 — strong match
      ↓
GPT-4o: "The last time you mentioned feeling productive was
         February 25th, when you finished the HeyPoco backend."
```

### Scenario C — Person query

```
User: "What has Ahmed been up to?"
      ↓
Vector search: embed("Ahmed") → finds all Ahmed entries
      ↓
SQL: WHERE extracted_fields->>'person' = 'Ahmed'
      ↓
Merge both results
      ↓
GPT-4o synthesizes all Ahmed-related entries into an answer
```

### Scenario D — Journal query

```
User: "Show me my journals this week"
      ↓
type = 'journal' detected
      ↓
SQL only:
  SELECT * FROM entries
  WHERE user_id = ?
    AND type = 'journal'
    AND year_number = 2026
    AND week_number = 8
  ORDER BY entry_date DESC;
      ↓
Return entries directly — no GPT-4o needed
Fast. Cheap. Exact.
```

---

## 13. Three Query States

Every query resolves to one of three states:

```
State 1 — Found it
  Vector search returns similarity < 0.5
  → Answer directly from those entries

State 2 — Didn't find specific thing, but have related data
  Vector search returns nothing strong
  Finance signal detected
  → Fallback: show all spend for the period
  → "Couldn't find 'shopping'. Here's everything you spent:"

State 3 — Nothing at all
  Vector search returns nothing strong
  No finance signal
  → Honest empty state
  → "Nothing in your logs matches that yet"
```

---

## 14. Build Order

### Your side (ingestion)

```
✓ DONE    transcription_service.py   transcribe(audio) → raw_text
✓ DONE    embedding_service.py       embed(text) → vector[1536]

BUILD NEXT:
  □ pii_service.py                   detect_pii(raw_text) → dict
  □ extraction_service.py            extract(text, date, tz) → dict
  □ Database migration               profiles + entries tables
  □ POST /entries                    wire all steps, store to DB
  □ End-to-end test                  voice → DB confirmed
```

### Your friend's side (retrieval)

```
BUILD:
  □ query_classifier.py              classify_query(question) → dict
  □ retrieval_service.py             SQL + vector hybrid search
  □ synthesis_service.py             synthesize(question, entries) → answer
  □ GET /query                       wire retrieval pipeline
```

### Shared (both use)

```
✓ DONE    embed()                    you built it, friend imports it
  □       match_entries()            Supabase SQL function, shared
  □       Supabase schema            one migration, both use it
```

---

## 15. Migration Files

```
supabase/migrations/
  001_create_profiles.sql       profiles table + trigger + RLS
  002_create_entries.sql        entries table + generated columns
  003_enable_rls.sql            RLS policies for all tables
  004_create_indexes.sql        all indexes including HNSW
  005_create_match_entries.sql  vector search function
  006_create_weekly_summaries.sql  post-MVP
```

---

## 16. What Is Never Built

| Feature | Decision |
|---|---|
| Bank sync / Plaid | Never — violates product philosophy |
| Third-party integrations | Never — re-fragments the experience |
| Streaks / gamification | Never — creates guilt, not relief |
| Social / sharing | Never — private tool by design |
| Receipt OCR | V2 — core mechanic is voice |
| Health domain | V2 — trust earned first |

---

*HeyPoco · Architecture Reference · February 2026 · Internal*
