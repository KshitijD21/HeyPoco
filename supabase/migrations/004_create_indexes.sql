-- 004_create_indexes.sql
-- Performance indexes for all query patterns defined in the architecture
-- Dominant query: user + time range
CREATE INDEX IF NOT EXISTS idx_entries_user_date ON public.entries(user_id, entry_date DESC);
-- Type filtering: journals this week, finance this month
CREATE INDEX IF NOT EXISTS idx_entries_user_type ON public.entries(user_id, type, entry_date DESC);
-- Finance fallback: all entries with an amount
CREATE INDEX IF NOT EXISTS idx_entries_amount ON public.entries((extracted_fields->>'amount'))
WHERE extracted_fields ? 'amount';
-- JSONB fast lookup
CREATE INDEX IF NOT EXISTS idx_entries_tags ON public.entries USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_entries_fields ON public.entries USING GIN(extracted_fields);
-- Non-sensitive entries only (excludes PII from search)
CREATE INDEX IF NOT EXISTS idx_entries_public ON public.entries(user_id, type, entry_date)
WHERE is_sensitive = FALSE;
-- Vector search — HNSW is faster than IVFFlat at this scale
CREATE INDEX IF NOT EXISTS idx_entries_embedding ON public.entries USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
