-- 002_create_entries.sql
-- Creates the entries table with JSONB fields and vector embedding support

CREATE EXTENSION IF NOT EXISTS "vector";

CREATE TYPE entry_type AS ENUM ('finance', 'link', 'career', 'document', 'general');

CREATE TABLE IF NOT EXISTS public.entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type entry_type NOT NULL DEFAULT 'general',
    raw_text TEXT NOT NULL,
    extracted_fields JSONB NOT NULL DEFAULT '{}',
    tags TEXT[] NOT NULL DEFAULT '{}',
    attachments TEXT[] NOT NULL DEFAULT '{}',
    embedding VECTOR(1536),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Vector similarity search function
CREATE OR REPLACE FUNCTION match_entries(
    query_embedding VECTOR(1536),
    match_user_id UUID,
    match_count INT DEFAULT 10
)
RETURNS SETOF public.entries
LANGUAGE sql
STABLE
AS $$
    SELECT *
    FROM public.entries
    WHERE user_id = match_user_id
      AND embedding IS NOT NULL
    ORDER BY embedding <=> query_embedding
    LIMIT match_count;
$$;
