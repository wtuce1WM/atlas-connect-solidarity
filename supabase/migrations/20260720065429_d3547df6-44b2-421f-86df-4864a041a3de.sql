
CREATE OR REPLACE FUNCTION public.get_showcase_site_stats(p_business_id uuid, p_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_staff boolean := false;
  v_owner boolean := false;
  v_totals jsonb;
  v_series jsonb;
  v_referrers jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT public.has_role(v_uid, 'admin') OR public.has_role(v_uid, 'staff') INTO v_is_staff;

  SELECT EXISTS (
    SELECT 1 FROM public.businesses b
    JOIN public.affiliates a ON a.id = b.affiliate_id
    WHERE b.id = p_business_id AND a.user_id = v_uid
  ) INTO v_owner;

  IF NOT v_is_staff AND NOT v_owner THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  WITH ev AS (
    SELECT event_type, referrer_domain, created_at::date AS d
    FROM public.business_events
    WHERE business_id = p_business_id
      AND (source_page LIKE '/site/%' OR source_page LIKE '%/site/%')
      AND created_at >= (now() - (p_days || ' days')::interval)
  )
  SELECT
    (SELECT jsonb_object_agg(event_type, c) FROM (SELECT event_type, count(*) c FROM ev GROUP BY event_type) t),
    (SELECT jsonb_agg(jsonb_build_object('date', d, 'views', views, 'clicks', clicks) ORDER BY d)
       FROM (
         SELECT d,
                sum(CASE WHEN event_type='view' THEN 1 ELSE 0 END) views,
                sum(CASE WHEN event_type IN ('whatsapp_click','phone_click','email_click','outbound_click','booking_intent') THEN 1 ELSE 0 END) clicks
         FROM ev GROUP BY d
       ) s),
    (SELECT jsonb_agg(jsonb_build_object('domain', referrer_domain, 'count', c) ORDER BY c DESC)
       FROM (SELECT referrer_domain, count(*) c FROM ev WHERE referrer_domain IS NOT NULL GROUP BY referrer_domain LIMIT 10) r)
  INTO v_totals, v_series, v_referrers;

  RETURN jsonb_build_object(
    'totals', COALESCE(v_totals, '{}'::jsonb),
    'series', COALESCE(v_series, '[]'::jsonb),
    'referrers', COALESCE(v_referrers, '[]'::jsonb),
    'days', p_days
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_showcase_site_stats(uuid, int) TO authenticated;
