ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS city_scope text;

CREATE OR REPLACE FUNCTION public.get_blog_analytics(p_days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      SELECT coalesce(jsonb_agg(x ORDER BY (x->>'views')::int DESC, x->>'title'), '[]'::jsonb) FROM (
        SELECT jsonb_build_object(
          'slug', s.slug,
          'title', s.title,
          'is_published', s.is_published,
          'views', s.views,
          'sessions', s.sessions,
          'bookmarks', (SELECT count(*) FROM article_bookmarks ab WHERE ab.article_slug = s.slug)
        ) AS x
        FROM (
          -- tous les articles publiés + tout slug ayant reçu des vues sur la période
          SELECT b.slug,
                 coalesce(b.title_fr, b.slug) AS title,
                 b.is_published,
                 (SELECT count(*) FROM blog_post_views v WHERE v.slug = b.slug AND v.created_at >= v_since) AS views,
                 (SELECT count(DISTINCT v.session_id) FROM blog_post_views v WHERE v.slug = b.slug AND v.created_at >= v_since) AS sessions
          FROM blog_posts b
          WHERE b.is_published
          UNION
          SELECT v.slug,
                 coalesce(b.title_fr, v.slug) AS title,
                 coalesce(b.is_published, false) AS is_published,
                 count(*) AS views,
                 count(DISTINCT v.session_id) AS sessions
          FROM blog_post_views v
          LEFT JOIN blog_posts b ON b.slug = v.slug
          WHERE v.created_at >= v_since
            AND NOT EXISTS (SELECT 1 FROM blog_posts b2 WHERE b2.slug = v.slug AND b2.is_published)
          GROUP BY v.slug, b.title_fr, b.is_published
        ) s
      ) t
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
$function$;