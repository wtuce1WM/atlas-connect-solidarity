CREATE OR REPLACE FUNCTION public.get_badges_video_feed(_badge_ids uuid[], _seed text, _limit integer, _offset integer, _city_ids uuid[], _include_no_city boolean DEFAULT false)
 RETURNS TABLE(id text, source text, is_generic boolean, url text, title text, description text, price text, thumbnail_url text, business_id uuid, business_name text, business_logo_url text, business_logo_bg text, social_platform text, social_account text, social_url text, badges jsonb, group_key text, feed_position bigint, total_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
WITH internal AS (
  SELECT DISTINCT
    d.id::text AS id,
    'internal'::text AS source,
    false AS is_generic,
    COALESCE(NULLIF(d.youtube_video_url, ''), NULLIF(d.instagram_video_url, ''), NULLIF(d.tiktok_video_url, ''), NULLIF(d.url, '')) AS url,
    d.name AS title,
    d.description AS description,
    d.price AS price,
    d.thumbnail_url AS thumbnail_url,
    COALESCE(d.linked_business_id, d.business_id) AS business_id,
    CASE
      WHEN NULLIF(d.instagram_account, '') IS NOT NULL THEN 'instagram'
      WHEN NULLIF(d.tiktok_account, '') IS NOT NULL THEN 'tiktok'
      WHEN NULLIF(d.youtube_account, '') IS NOT NULL THEN 'youtube'
    END::text AS social_platform,
    COALESCE(NULLIF(d.instagram_account, ''), NULLIF(d.tiktok_account, ''), NULLIF(d.youtube_account, ''))::text AS social_account,
    CASE
      WHEN NULLIF(d.instagram_account, '') IS NOT NULL THEN NULLIF(d.instagram_url, '')
      WHEN NULLIF(d.tiktok_account, '') IS NOT NULL THEN NULLIF(d.tiktok_url, '')
      WHEN NULLIF(d.youtube_account, '') IS NOT NULL THEN NULLIF(d.youtube_url, '')
    END::text AS social_url
  FROM public.business_documents d
  JOIN public.business_document_badges bdb
    ON bdb.document_id = d.id AND bdb.badge_id = ANY(_badge_ids)
  WHERE d.type = 'video'
    AND COALESCE(d.business_is_active, true) = true
    AND (
      _city_ids IS NULL
      OR EXISTS (SELECT 1 FROM public.business_document_cities c WHERE c.document_id = d.id AND c.city_id = ANY(_city_ids))
      OR (COALESCE(_include_no_city, false)
          AND NOT EXISTS (SELECT 1 FROM public.business_document_cities c WHERE c.document_id = d.id))
    )
),
yt AS (
  SELECT DISTINCT
    y.id::text AS id,
    'youtube'::text AS source,
    false AS is_generic,
    (CASE WHEN y.is_short IS TRUE THEN 'https://www.youtube.com/shorts/' ELSE 'https://www.youtube.com/watch?v=' END || y.video_id) AS url,
    y.title AS title,
    NULL::text AS description,
    NULL::text AS price,
    COALESCE(NULLIF(y.custom_thumbnail_url, ''), NULLIF(y.thumbnail, ''), 'https://i.ytimg.com/vi/' || y.video_id || '/hqdefault.jpg') AS thumbnail_url,
    y.business_id AS business_id,
    'youtube'::text AS social_platform,
    yb2.name::text AS social_account,
    NULLIF(yb2.youtube_url, '')::text AS social_url
  FROM public.business_youtube_videos y
  JOIN public.business_youtube_video_badges yb
    ON yb.youtube_video_id = y.id AND yb.badge_id = ANY(_badge_ids)
  LEFT JOIN public.businesses yb2 ON yb2.id = y.business_id
  WHERE COALESCE(y.business_is_active, true) = true
    AND COALESCE(y.video_id, '') <> ''
    AND COALESCE(yb2.youtube_channel_featured, false) = true
    AND (
      _city_ids IS NULL
      OR EXISTS (SELECT 1 FROM public.business_youtube_video_cities c WHERE c.youtube_video_id = y.id AND c.city_id = ANY(_city_ids))
      OR (COALESCE(_include_no_city, false)
          AND NOT EXISTS (SELECT 1 FROM public.business_youtube_video_cities c WHERE c.youtube_video_id = y.id))
    )
),
gen AS (
  SELECT DISTINCT
    g.id::text AS id,
    'generic'::text AS source,
    true AS is_generic,
    g.url AS url,
    COALESCE(NULLIF(g.title, ''), NULLIF(g.name, '')) AS title,
    g.description AS description,
    NULL::text AS price,
    g.thumbnail_url AS thumbnail_url,
    (
      SELECT gb.business_id FROM public.generic_video_businesses gb
      WHERE gb.generic_video_id = g.id
      ORDER BY gb.sort_order NULLS LAST, gb.created_at
      LIMIT 1
    ) AS business_id,
    CASE
      WHEN NULLIF(g.instagram_account, '') IS NOT NULL THEN 'instagram'
      WHEN NULLIF(g.tiktok_account, '') IS NOT NULL THEN 'tiktok'
      WHEN NULLIF(g.youtube_account, '') IS NOT NULL THEN 'youtube'
    END::text AS social_platform,
    COALESCE(NULLIF(g.instagram_account, ''), NULLIF(g.tiktok_account, ''), NULLIF(g.youtube_account, ''))::text AS social_account,
    CASE
      WHEN NULLIF(g.instagram_account, '') IS NOT NULL THEN NULLIF(g.instagram_url, '')
      WHEN NULLIF(g.tiktok_account, '') IS NOT NULL THEN NULLIF(g.tiktok_url, '')
      WHEN NULLIF(g.youtube_account, '') IS NOT NULL THEN NULLIF(g.youtube_url, '')
    END::text AS social_url
  FROM public.generic_videos g
  JOIN public.generic_video_badges gvb
    ON gvb.generic_video_id = g.id AND gvb.badge_id = ANY(_badge_ids)
  WHERE COALESCE(g.url, '') <> ''
    AND (
      _city_ids IS NULL
      OR EXISTS (SELECT 1 FROM public.generic_video_cities c WHERE c.generic_video_id = g.id AND c.city_id = ANY(_city_ids))
      OR (COALESCE(_include_no_city, false)
          AND NOT EXISTS (SELECT 1 FROM public.generic_video_cities c WHERE c.generic_video_id = g.id))
    )
),
all_videos AS (
  SELECT * FROM internal
  UNION ALL
  SELECT * FROM yt
  UNION ALL
  SELECT * FROM gen
),
hashed AS (
  SELECT
    a.*,
    md5(a.id || ':' || COALESCE(_seed, '')) AS h,
    COALESCE(a.business_id::text, a.source || ':' || a.id) AS group_key
  FROM all_videos a
  WHERE a.url IS NOT NULL AND a.url <> ''
),
grouped AS (
  SELECT
    hs.*,
    row_number() OVER (PARTITION BY hs.group_key ORDER BY hs.h) AS pos_in_group
  FROM hashed hs
),
ordered AS (
  SELECT
    gr.*,
    row_number() OVER (ORDER BY ((gr.pos_in_group - 1) / 2), gr.h) AS feed_position,
    count(*) OVER () AS total_count
  FROM grouped gr
)
SELECT
  o.id,
  o.source,
  o.is_generic,
  o.url,
  o.title,
  o.description,
  o.price,
  o.thumbnail_url,
  o.business_id,
  b.name AS business_name,
  b.logo_url AS business_logo_url,
  b.logo_bg AS business_logo_bg,
  o.social_platform,
  o.social_account,
  o.social_url,
  COALESCE((
    SELECT jsonb_agg(x ORDER BY x->>'sort_order', x->>'name')
    FROM (
      SELECT DISTINCT jsonb_build_object(
        'id', bg.id,
        'name', bg.name_fr,
        'name_en', bg.name_en,
        'color', bg.color_hex,
        'text_color', bg.text_color_hex,
        'sort_order', bg.sort_order
      ) AS x
      FROM public.badges bg
      WHERE bg.is_active_on_front IS TRUE
        AND (
          (o.source = 'internal' AND EXISTS (
            SELECT 1 FROM public.business_document_badges l
            WHERE l.document_id = o.id::uuid AND l.badge_id = bg.id))
          OR (o.source = 'youtube' AND EXISTS (
            SELECT 1 FROM public.business_youtube_video_badges l
            WHERE l.youtube_video_id = o.id::uuid AND l.badge_id = bg.id))
          OR (o.source = 'generic' AND EXISTS (
            SELECT 1 FROM public.generic_video_badges l
            WHERE l.generic_video_id = o.id::uuid AND l.badge_id = bg.id))
        )
    ) s
  ), '[]'::jsonb) AS badges,
  o.group_key,
  o.feed_position,
  o.total_count
FROM ordered o
LEFT JOIN public.businesses b ON b.id = o.business_id
ORDER BY o.feed_position
OFFSET GREATEST(COALESCE(_offset, 0), 0)
LIMIT LEAST(GREATEST(COALESCE(_limit, 60), 1), 300);
$function$;

CREATE OR REPLACE FUNCTION public.get_badge_video_feed(_badge_id uuid, _seed text DEFAULT 'owm'::text, _limit integer DEFAULT 60, _offset integer DEFAULT 0, _city_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS TABLE(id text, source text, is_generic boolean, url text, title text, description text, price text, thumbnail_url text, business_id uuid, business_name text, business_logo_url text, business_logo_bg text, group_key text, feed_position bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
WITH internal AS (
  SELECT
    d.id::text AS id,
    'internal'::text AS source,
    false AS is_generic,
    COALESCE(NULLIF(d.youtube_video_url, ''), NULLIF(d.instagram_video_url, ''), NULLIF(d.tiktok_video_url, ''), NULLIF(d.url, '')) AS url,
    d.name AS title,
    d.description AS description,
    d.price AS price,
    d.thumbnail_url AS thumbnail_url,
    COALESCE(d.linked_business_id, d.business_id) AS business_id
  FROM public.business_documents d
  JOIN public.business_document_badges bdb
    ON bdb.document_id = d.id AND bdb.badge_id = _badge_id
  WHERE d.type = 'video'
    AND COALESCE(d.business_is_active, true) = true
    AND (
      _city_ids IS NULL
      OR EXISTS (SELECT 1 FROM public.business_document_cities c WHERE c.document_id = d.id AND c.city_id = ANY(_city_ids))
    )
),
yt AS (
  SELECT
    y.id::text AS id,
    'youtube'::text AS source,
    false AS is_generic,
    (CASE WHEN y.is_short IS TRUE THEN 'https://www.youtube.com/shorts/' ELSE 'https://www.youtube.com/watch?v=' END || y.video_id) AS url,
    y.title AS title,
    NULL::text AS description,
    NULL::text AS price,
    COALESCE(NULLIF(y.custom_thumbnail_url, ''), NULLIF(y.thumbnail, ''), 'https://i.ytimg.com/vi/' || y.video_id || '/hqdefault.jpg') AS thumbnail_url,
    y.business_id AS business_id
  FROM public.business_youtube_videos y
  JOIN public.business_youtube_video_badges yb
    ON yb.youtube_video_id = y.id AND yb.badge_id = _badge_id
  WHERE COALESCE(y.business_is_active, true) = true
    AND COALESCE(y.video_id, '') <> ''
    AND EXISTS (
      SELECT 1 FROM public.businesses fb
      WHERE fb.id = y.business_id
        AND COALESCE(fb.youtube_channel_featured, false) = true
    )
    AND (
      _city_ids IS NULL
      OR EXISTS (SELECT 1 FROM public.business_youtube_video_cities c WHERE c.youtube_video_id = y.id AND c.city_id = ANY(_city_ids))
    )
),
gen AS (
  SELECT
    g.id::text AS id,
    'generic'::text AS source,
    true AS is_generic,
    g.url AS url,
    COALESCE(NULLIF(g.title, ''), NULLIF(g.name, '')) AS title,
    g.description AS description,
    NULL::text AS price,
    g.thumbnail_url AS thumbnail_url,
    (
      SELECT gb.business_id FROM public.generic_video_businesses gb
      WHERE gb.generic_video_id = g.id
      ORDER BY gb.sort_order NULLS LAST, gb.created_at
      LIMIT 1
    ) AS business_id
  FROM public.generic_videos g
  JOIN public.generic_video_badges gvb
    ON gvb.generic_video_id = g.id AND gvb.badge_id = _badge_id
  WHERE COALESCE(g.url, '') <> ''
    AND (
      _city_ids IS NULL
      OR EXISTS (SELECT 1 FROM public.generic_video_cities c WHERE c.generic_video_id = g.id AND c.city_id = ANY(_city_ids))
    )
),
all_videos AS (
  SELECT * FROM internal
  UNION ALL
  SELECT * FROM yt
  UNION ALL
  SELECT * FROM gen
),
hashed AS (
  SELECT
    a.*,
    md5(a.id || ':' || COALESCE(_seed, '')) AS h,
    COALESCE(a.business_id::text, a.source || ':' || a.id) AS group_key
  FROM all_videos a
  WHERE a.url IS NOT NULL AND a.url <> ''
),
grouped AS (
  SELECT
    hs.*,
    row_number() OVER (PARTITION BY hs.group_key ORDER BY hs.h) AS pos_in_group
  FROM hashed hs
),
ordered AS (
  SELECT
    gr.*,
    row_number() OVER (ORDER BY gr.pos_in_group, gr.h) AS feed_position
  FROM grouped gr
)
SELECT
  o.id,
  o.source,
  o.is_generic,
  o.url,
  o.title,
  o.description,
  o.price,
  o.thumbnail_url,
  o.business_id,
  b.name AS business_name,
  b.logo_url AS business_logo_url,
  b.logo_bg AS business_logo_bg,
  o.group_key,
  o.feed_position
FROM ordered o
LEFT JOIN public.businesses b ON b.id = o.business_id
ORDER BY o.feed_position
OFFSET GREATEST(COALESCE(_offset, 0), 0)
LIMIT LEAST(GREATEST(COALESCE(_limit, 60), 1), 300);
$function$;