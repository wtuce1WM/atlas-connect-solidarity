
CREATE OR REPLACE FUNCTION public.get_club_ai_usage_by_user(p_since timestamptz DEFAULT NULL)
RETURNS TABLE(
  user_id uuid,
  event_count bigint,
  input_tokens bigint,
  output_tokens bigint,
  total_tokens bigint,
  total_cost_usd numeric,
  last_used_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.user_id,
    count(*)::bigint,
    COALESCE(sum(e.input_tokens), 0)::bigint,
    COALESCE(sum(e.output_tokens), 0)::bigint,
    COALESCE(sum(e.total_tokens), 0)::bigint,
    COALESCE(sum(e.estimated_cost_usd), 0)::numeric,
    max(e.created_at)
  FROM public.ai_usage_events e
  WHERE e.user_id IS NOT NULL
    AND public.is_staff(auth.uid())
    AND (p_since IS NULL OR e.created_at >= p_since)
  GROUP BY e.user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_club_ai_usage_by_user(timestamptz) TO authenticated;
