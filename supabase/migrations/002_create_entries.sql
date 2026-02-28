-- 002_create_entries.sql
-- Creates the entries table with JSONB fields, PII support, and vector embeddings
-- Type is free TEXT (no ENUM) — add new domains by updating extraction prompt only
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS public.entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    -- Input source
    source TEXT NOT NULL DEFAULT 'voice' CHECK (source IN ('voice', 'text')),
    -- Content — raw_text NEVER modified after creation
    raw_text TEXT NOT NULL,
    -- Free text type — NO ENUM, NO CHECK constraint
    -- finance | journal | task | event | note | health | general
    -- Add new domains by updating extraction prompt only, zero migrations
    type TEXT NOT NULL DEFAULT 'general',
    -- All domain-specific fields live here (see architecture doc Section 4)
    extracted_fields JSONB NOT NULL DEFAULT '{}',
    -- Short labels for display and filtering
    tags TEXT [] NOT NULL DEFAULT '{}',
    -- When it HAPPENED vs when it was LOGGED
    -- "Yesterday I spent $60" → entry_date=yesterday, created_at=today
    entry_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    -- Security — PII entries never embedded, never in search results
    is_sensitive BOOLEAN DEFAULT FALSE,
    pii_types TEXT [],
    -- Semantic search vector
    -- NULL for sensitive entries — never send PII to embedding API
    embedding VECTOR(1536) -- Note: day/week/year are computed inline in queries using EXTRACT()
    -- Generated columns are not used due to TIMESTAMPTZ immutability constraints in PostgreSQL
);
