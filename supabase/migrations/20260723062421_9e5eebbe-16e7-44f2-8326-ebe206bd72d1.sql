DROP FUNCTION IF EXISTS public.match_club_suggestions(vector, integer, double precision);
CREATE OR REPLACE FUNCTION public.match_club_suggestions(
  query_embedding vector,
  match_count integer DEFAULT 3,
  min_similarity double precision DEFAULT 0.78
)
RETURNS TABLE(
  id uuid,
  label_fr text,
  label_en text,
  label_ar text,
  fixed_response_fr text,
  fixed_response_en text,
  fixed_response_ar text,
  blog_post_ids uuid[],
  similarity double precision
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT
    s.id, s.label_fr, s.label_en, s.label_ar,
    s.fixed_response_fr, s.fixed_response_en, s.fixed_response_ar,
    s.blog_post_ids,
    1 - (s.label_embedding <=> query_embedding) AS similarity
  FROM public.club_ai_suggestions s
  WHERE s.is_active = true
    AND s.label_embedding IS NOT NULL
    AND (s.fixed_response_fr IS NOT NULL OR s.fixed_response_en IS NOT NULL OR s.fixed_response_ar IS NOT NULL)
    AND 1 - (s.label_embedding <=> query_embedding) >= min_similarity
  ORDER BY s.label_embedding <=> query_embedding ASC
  LIMIT match_count;
$function$;