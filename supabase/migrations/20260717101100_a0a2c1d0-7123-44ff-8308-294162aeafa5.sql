
CREATE OR REPLACE FUNCTION public.get_business_analytics(p_business_id uuid, p_range text DEFAULT '30d'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_interval interval;
  v_since timestamptz;
  v_prev_since timestamptz;
  v_totals jsonb;
  v_prev_totals jsonb;
  v_timeseries jsonb;
  v_prev_timeseries jsonb;
  v_by_source jsonb;
  v_by_country jsonb;
  v_by_device jsonb;
  v_top_referrers jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT (public.is_staff(v_uid) OR public.is_own_affiliate_business(v_uid, p_business_id)) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  v_interval := CASE p_range
    WHEN '7d'  THEN interval '7 days'
    WHEN '30d' THEN interval '30 days'
    WHEN '90d' THEN interval '90 days'
    WHEN '12m' THEN interval '365 days'
    ELSE interval '30 days'
  END;
  v_since := now() - v_interval;
  v_prev_since := v_since - v_interval;

  SELECT jsonb_object_agg(event_type, c) INTO v_totals
  FROM (
    SELECT event_type, count(*)::int AS c
    FROM public.business_events
    WHERE business_id = p_business_id AND created_at >= v_since
    GROUP BY event_type
  ) t;

  SELECT jsonb_object_agg(event_type, c) INTO v_prev_totals
  FROM (
    SELECT event_type, count(*)::int AS c
    FROM public.business_events
    WHERE business_id = p_business_id
      AND created_at >= v_prev_since AND created_at < v_since
    GROUP BY event_type
  ) t;

  SELECT jsonb_agg(row_to_json(s) ORDER BY s.day) INTO v_timeseries
  FROM (
    SELECT
      date_trunc('day', created_at)::date AS day,
      count(*) FILTER (WHERE event_type = 'view')::int AS views,
      count(*) FILTER (WHERE event_type IN ('whatsapp_click','phone_click','email_click','directions_click','affiliate_click','booking_intent'))::int AS intents
    FROM public.business_events
    WHERE business_id = p_business_id AND created_at >= v_since
    GROUP BY 1
  ) s;

  SELECT jsonb_agg(row_to_json(s) ORDER BY s.day) INTO v_prev_timeseries
  FROM (
    SELECT
      date_trunc('day', created_at)::date AS day,
      count(*) FILTER (WHERE event_type = 'view')::int AS views,
      count(*) FILTER (WHERE event_type IN ('whatsapp_click','phone_click','email_click','directions_click','affiliate_click','booking_intent'))::int AS intents
    FROM public.business_events
    WHERE business_id = p_business_id
      AND created_at >= v_prev_since AND created_at < v_since
    GROUP BY 1
  ) s;

  SELECT jsonb_agg(row_to_json(s)) INTO v_by_source
  FROM (
    SELECT source_page, count(*)::int AS c
    FROM public.business_events
    WHERE business_id = p_business_id AND created_at >= v_since
      AND source_page IS NOT NULL
    GROUP BY source_page ORDER BY c DESC LIMIT 10
  ) s;

  SELECT jsonb_agg(row_to_json(s)) INTO v_by_country
  FROM (
    SELECT country, count(*)::int AS c
    FROM public.business_events
    WHERE business_id = p_business_id AND created_at >= v_since
      AND country IS NOT NULL
    GROUP BY country ORDER BY c DESC LIMIT 10
  ) s;

  SELECT jsonb_agg(row_to_json(s)) INTO v_by_device
  FROM (
    SELECT device, count(*)::int AS c
    FROM public.business_events
    WHERE business_id = p_business_id AND created_at >= v_since
      AND device IS NOT NULL
    GROUP BY device ORDER BY c DESC
  ) s;

  SELECT jsonb_agg(row_to_json(s)) INTO v_top_referrers
  FROM (
    SELECT referrer_domain, count(*)::int AS c
    FROM public.business_events
    WHERE business_id = p_business_id AND created_at >= v_since
      AND referrer_domain IS NOT NULL
    GROUP BY referrer_domain ORDER BY c DESC LIMIT 10
  ) s;

  RETURN jsonb_build_object(
    'range', p_range,
    'since', v_since,
    'prev_since', v_prev_since,
    'totals', COALESCE(v_totals, '{}'::jsonb),
    'previous_totals', COALESCE(v_prev_totals, '{}'::jsonb),
    'timeseries', COALESCE(v_timeseries, '[]'::jsonb),
    'previous_timeseries', COALESCE(v_prev_timeseries, '[]'::jsonb),
    'by_source_page', COALESCE(v_by_source, '[]'::jsonb),
    'by_country', COALESCE(v_by_country, '[]'::jsonb),
    'by_device', COALESCE(v_by_device, '[]'::jsonb),
    'top_referrers', COALESCE(v_top_referrers, '[]'::jsonb)
  );
END;
$function$;
