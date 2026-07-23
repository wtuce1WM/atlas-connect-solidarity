
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE public.club_ai_suggestions
  ADD COLUMN IF NOT EXISTS label_embedding vector(1536),
  ADD COLUMN IF NOT EXISTS label_embedded_source text,
  ADD COLUMN IF NOT EXISTS label_embedded_at timestamptz;

CREATE INDEX IF NOT EXISTS club_ai_suggestions_label_embedding_idx
  ON public.club_ai_suggestions USING hnsw (label_embedding vector_cosine_ops);

CREATE OR REPLACE FUNCTION public.match_club_suggestions(
  query_embedding vector(1536),
  match_count int DEFAULT 3,
  min_similarity float DEFAULT 0.78
)
RETURNS TABLE (
  id uuid,
  label_fr text,
  label_en text,
  label_ar text,
  fixed_response_fr text,
  fixed_response_en text,
  fixed_response_ar text,
  similarity float
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    s.id,
    s.label_fr,
    s.label_en,
    s.label_ar,
    s.fixed_response_fr,
    s.fixed_response_en,
    s.fixed_response_ar,
    1 - (s.label_embedding <=> query_embedding) AS similarity
  FROM public.club_ai_suggestions s
  WHERE s.is_active = true
    AND s.label_embedding IS NOT NULL
    AND (
      s.fixed_response_fr IS NOT NULL
      OR s.fixed_response_en IS NOT NULL
      OR s.fixed_response_ar IS NOT NULL
    )
    AND 1 - (s.label_embedding <=> query_embedding) >= min_similarity
  ORDER BY s.label_embedding <=> query_embedding ASC
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_club_suggestions(vector, int, float) TO authenticated, service_role;
