CREATE TABLE public.blog_post_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL,
  language text,
  session_id text,
  source text,
  referrer_domain text,
  device text,
  country text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_blog_post_views_slug_created ON public.blog_post_views (slug, created_at DESC);

GRANT INSERT ON public.blog_post_views TO anon;
GRANT INSERT, SELECT ON public.blog_post_views TO authenticated;
GRANT ALL ON public.blog_post_views TO service_role;

ALTER TABLE public.blog_post_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can log a blog view" ON public.blog_post_views FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "staff can read blog views" ON public.blog_post_views FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.get_blog_analytics(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_since timestamptz := now() - (p_days || ' days')::interval;
  v_prev_since timestamptz := now() - (2 * p_days || ' days')::interval;
  v_result jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT jsonb_build_object(
    'days', p_days,
    'since', v_since,
    'total_views', (SELECT count(*) FROM blog_post_views WHERE created_at >= v_since),
    'previous_total_views', (SELECT count(*) FROM blog_post_views WHERE created_at >= v_prev_since AND created_at < v_since),
    'unique_sessions', (SELECT count(DISTINCT session_id) FROM blog_post_views WHERE created_at >= v_since),
    'by_post', (
      SELECT coalesce(jsonb_agg(x ORDER BY (x->>'views')::int DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object(
          'slug', v.slug,
          'title', coalesce(b.title_fr, v.slug),
          'is_published', coalesce(b.is_published, false),
          'views', count(*),
          'sessions', count(DISTINCT v.session_id),
          'bookmarks', (SELECT count(*) FROM article_bookmarks ab WHERE ab.article_slug = v.slug)
        ) AS x
        FROM blog_post_views v
        LEFT JOIN blog_posts b ON b.slug = v.slug
        WHERE v.created_at >= v_since
        GROUP BY v.slug, b.title_fr, b.is_published
      ) s
    ),
    'timeseries', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('day', d, 'views', c) ORDER BY d), '[]'::jsonb) FROM (
        SELECT date_trunc('day', created_at)::date AS d, count(*) AS c
        FROM blog_post_views WHERE created_at >= v_since GROUP BY 1
      ) t
    ),
    'by_language', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('language', coalesce(language,'?'), 'c', c) ORDER BY c DESC), '[]'::jsonb) FROM (
        SELECT language, count(*) AS c FROM blog_post_views WHERE created_at >= v_since GROUP BY 1
      ) t
    ),
    'by_device', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('device', coalesce(device,'?'), 'c', c) ORDER BY c DESC), '[]'::jsonb) FROM (
        SELECT device, count(*) AS c FROM blog_post_views WHERE created_at >= v_since GROUP BY 1
      ) t
    ),
    'top_referrers', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('referrer_domain', referrer_domain, 'c', c) ORDER BY c DESC), '[]'::jsonb) FROM (
        SELECT referrer_domain, count(*) AS c FROM blog_post_views
        WHERE created_at >= v_since AND referrer_domain IS NOT NULL AND referrer_domain <> ''
        GROUP BY 1 ORDER BY 2 DESC LIMIT 10
      ) t
    ),
    'by_source', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('source', coalesce(source,'direct'), 'c', c) ORDER BY c DESC), '[]'::jsonb) FROM (
        SELECT source, count(*) AS c FROM blog_post_views WHERE created_at >= v_since GROUP BY 1
      ) t
    ),
    'catalog', (
      SELECT jsonb_build_object(
        'total', count(*),
        'published', count(*) FILTER (WHERE is_published),
        'pinned', count(*) FILTER (WHERE is_pinned),
        'with_en', count(*) FILTER (WHERE title_en IS NOT NULL AND title_en <> ''),
        'with_ar', count(*) FILTER (WHERE title_ar IS NOT NULL AND title_ar <> '')
      ) FROM blog_posts
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;