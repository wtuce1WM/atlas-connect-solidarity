
-- 1) Table business_events
CREATE TABLE public.business_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  business_id uuid NOT NULL,
  event_type text NOT NULL,
  event_subtype text,
  user_id uuid,
  session_id text,
  source_page text,
  referrer_domain text,
  device text,
  country text,
  city text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_events_type_chk CHECK (event_type IN (
    'view','whatsapp_click','phone_click','email_click','directions_click',
    'affiliate_click','bookmark_add','bookmark_remove','share_open','share_complete',
    'booking_intent','video_play','document_open','outbound_click'
  ))
);

CREATE INDEX business_events_business_created_idx
  ON public.business_events (business_id, created_at DESC);
CREATE INDEX business_events_business_type_created_idx
  ON public.business_events (business_id, event_type, created_at DESC);
CREATE INDEX business_events_created_idx
  ON public.business_events (created_at DESC);

-- 2) GRANTs (insert public, select via service_role only)
GRANT INSERT ON public.business_events TO anon, authenticated;
GRANT ALL ON public.business_events TO service_role;

-- 3) RLS
ALTER TABLE public.business_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert business events"
  ON public.business_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- No SELECT/UPDATE/DELETE policy: client cannot read; only service_role + security definer RPC.

-- 4) RPC d'agrégation
CREATE OR REPLACE FUNCTION public.get_business_analytics(
  p_business_id uuid,
  p_range text DEFAULT '30d'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_interval interval;
  v_since timestamptz;
  v_prev_since timestamptz;
  v_totals jsonb;
  v_prev_totals jsonb;
  v_timeseries jsonb;
  v_by_source jsonb;
  v_by_country jsonb;
  v_by_device jsonb;
  v_top_referrers jsonb;
BEGIN
  -- Auth: staff OR owner of the affiliated business
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

  -- Totals current period
  SELECT jsonb_object_agg(event_type, c) INTO v_totals
  FROM (
    SELECT event_type, count(*)::int AS c
    FROM public.business_events
    WHERE business_id = p_business_id AND created_at >= v_since
    GROUP BY event_type
  ) t;

  -- Totals previous period (for delta)
  SELECT jsonb_object_agg(event_type, c) INTO v_prev_totals
  FROM (
    SELECT event_type, count(*)::int AS c
    FROM public.business_events
    WHERE business_id = p_business_id
      AND created_at >= v_prev_since AND created_at < v_since
    GROUP BY event_type
  ) t;

  -- Timeseries by day
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

  -- Top source pages
  SELECT jsonb_agg(row_to_json(s)) INTO v_by_source
  FROM (
    SELECT source_page, count(*)::int AS c
    FROM public.business_events
    WHERE business_id = p_business_id AND created_at >= v_since
      AND source_page IS NOT NULL
    GROUP BY source_page
    ORDER BY c DESC
    LIMIT 10
  ) s;

  -- By country
  SELECT jsonb_agg(row_to_json(s)) INTO v_by_country
  FROM (
    SELECT country, count(*)::int AS c
    FROM public.business_events
    WHERE business_id = p_business_id AND created_at >= v_since
      AND country IS NOT NULL
    GROUP BY country
    ORDER BY c DESC
    LIMIT 10
  ) s;

  -- By device
  SELECT jsonb_agg(row_to_json(s)) INTO v_by_device
  FROM (
    SELECT device, count(*)::int AS c
    FROM public.business_events
    WHERE business_id = p_business_id AND created_at >= v_since
      AND device IS NOT NULL
    GROUP BY device
    ORDER BY c DESC
  ) s;

  -- Top external referrers
  SELECT jsonb_agg(row_to_json(s)) INTO v_top_referrers
  FROM (
    SELECT referrer_domain, count(*)::int AS c
    FROM public.business_events
    WHERE business_id = p_business_id AND created_at >= v_since
      AND referrer_domain IS NOT NULL
    GROUP BY referrer_domain
    ORDER BY c DESC
    LIMIT 10
  ) s;

  RETURN jsonb_build_object(
    'range', p_range,
    'since', v_since,
    'totals', COALESCE(v_totals, '{}'::jsonb),
    'previous_totals', COALESCE(v_prev_totals, '{}'::jsonb),
    'timeseries', COALESCE(v_timeseries, '[]'::jsonb),
    'by_source_page', COALESCE(v_by_source, '[]'::jsonb),
    'by_country', COALESCE(v_by_country, '[]'::jsonb),
    'by_device', COALESCE(v_by_device, '[]'::jsonb),
    'top_referrers', COALESCE(v_top_referrers, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_business_analytics(uuid, text) TO authenticated;

-- 5) Cleanup job: delete events older than 90 days (runs daily at 03:15 UTC)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('business_events_cleanup');
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'business_events_cleanup',
      '15 3 * * *',
      $cron$DELETE FROM public.business_events WHERE created_at < now() - interval '90 days'$cron$
    );
  END IF;
END $$;
