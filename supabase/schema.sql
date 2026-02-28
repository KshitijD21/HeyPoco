-- ============================================================================
-- HeyPoco — Full Database Schema (Reference Snapshot)
-- ============================================================================
-- This is the combined snapshot of all migrations (001–005).
-- For incremental changes, see the individual files in supabase/migrations/.
-- Excludes: weekly_summaries (post-MVP)
-- ============================================================================
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
-- ── 001: Profiles ───────────────────────────────────────────────────────────
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    display_name TEXT,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN
INSERT INTO public.profiles (id, email, display_name)
VALUES (NEW.id, NEW.email, SPLIT_PART(NEW.email, '@', 1));
RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER
INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- ── 002: Entries ────────────────────────────────────────────────────────────
CREATE TABLE public.entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    source TEXT NOT NULL DEFAULT 'voice' CHECK (source IN ('voice', 'text')),
    raw_text TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'general',
    extracted_fields JSONB NOT NULL DEFAULT '{}',
    tags TEXT [] NOT NULL DEFAULT '{}',
    entry_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    is_sensitive BOOLEAN DEFAULT FALSE,
    pii_types TEXT [],
    embedding VECTOR(1536) -- Note: day/week/year computed inline in queries via EXTRACT(week/year FROM entry_date)
);
-- ── 003: RLS ────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users can only see own profile" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "users can only see own entries" ON public.entries FOR ALL USING (auth.uid() = user_id);
-- ── 004: Indexes ────────────────────────────────────────────────────────────
CREATE INDEX idx_entries_user_date ON public.entries(user_id, entry_date DESC);
CREATE INDEX idx_entries_user_type ON public.entries(user_id, type, entry_date DESC);
CREATE INDEX idx_entries_amount ON public.entries((extracted_fields->>'amount'))
WHERE extracted_fields ? 'amount';
CREATE INDEX idx_entries_tags ON public.entries USING GIN(tags);
CREATE INDEX idx_entries_fields ON public.entries USING GIN(extracted_fields);
CREATE INDEX idx_entries_public ON public.entries(user_id, type, entry_date)
WHERE is_sensitive = FALSE;
CREATE INDEX idx_entries_embedding ON public.entries USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
-- ── 005: Vector Search Function ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION match_entries(
        query_embedding VECTOR(1536),
        match_user_id UUID,
        match_count INT DEFAULT 10,
        similarity_threshold FLOAT DEFAULT 0.6,
        type_filter TEXT DEFAULT NULL,
        date_from TIMESTAMPTZ DEFAULT NULL,
        date_to TIMESTAMPTZ DEFAULT NULL
    ) RETURNS TABLE (
        id UUID,
        type TEXT,
        raw_text TEXT,
        extracted_fields JSONB,
        tags TEXT [],
        entry_date TIMESTAMPTZ,
        similarity FLOAT
    ) LANGUAGE sql STABLE AS $$
SELECT e.id,
    e.type,
    e.raw_text,
    e.extracted_fields,
    e.tags,
    e.entry_date,
    (e.embedding <=> query_embedding) AS similarity
FROM public.entries e
WHERE e.user_id = match_user_id
    AND e.embedding IS NOT NULL
    AND e.is_sensitive = FALSE
    AND (e.embedding <=> query_embedding) <= similarity_threshold
    AND (
        type_filter IS NULL
        OR e.type = type_filter
    )
    AND (
        date_from IS NULL
        OR e.entry_date >= date_from
    )
    AND (
        date_to IS NULL
        OR e.entry_date <= date_to
    )
ORDER BY e.embedding <=> query_embedding
LIMIT match_count;
$$;
