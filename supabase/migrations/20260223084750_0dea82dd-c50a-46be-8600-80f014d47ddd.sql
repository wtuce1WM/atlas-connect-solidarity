
CREATE OR REPLACE FUNCTION public.search_businesses_with_rank(p_query text, p_city text DEFAULT NULL::text, p_category text DEFAULT NULL::text, p_service text DEFAULT NULL::text, p_limit integer DEFAULT 51)
 RETURNS SETOF businesses
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT b.*
  FROM businesses b
  WHERE
    b.is_active = true
    AND b.search_vector @@ to_tsquery('simple', p_query)
    AND (p_city IS NULL OR b.city ILIKE p_city)
    AND (
      p_category IS NULL
      OR b.main_category = p_category
      OR p_category = ANY(b.categories)
    )
    AND (
      p_service IS NULL
      OR EXISTS (SELECT 1 FROM unnest(b.services) s WHERE s ILIKE p_service || '%')
    )
  ORDER BY
    -- Exact name match gets highest priority
    CASE WHEN lower(b.name) = lower(p_query) THEN 0
         WHEN lower(b.name) ILIKE '%' || lower(p_query) || '%' THEN 1
         ELSE 2
    END ASC,
    ts_rank(
      ARRAY[0.05, 0.3, 0.6, 1.0],
      b.search_vector,
      to_tsquery('simple', p_query)
    ) DESC,
    CASE WHEN b.wtuce_status = 'verified' THEN 0 ELSE 1 END ASC,
    b.priority_score DESC NULLS LAST
  LIMIT p_limit;
END;
$function$;
