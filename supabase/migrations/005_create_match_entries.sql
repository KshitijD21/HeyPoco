-- 005_create_match_entries.sql
-- Vector search function with filtering support
-- Used by the retrieval pipeline for semantic queries
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
