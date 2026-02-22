-- 004_create_indexes.sql
-- Performance indexes for common query patterns

CREATE INDEX IF NOT EXISTS idx_entries_user_id ON public.entries(user_id);
CREATE INDEX IF NOT EXISTS idx_entries_type ON public.entries(type);
CREATE INDEX IF NOT EXISTS idx_entries_created_at ON public.entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entries_tags ON public.entries USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_entries_extracted_fields ON public.entries USING GIN(extracted_fields);
