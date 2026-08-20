CREATE OR REPLACE FUNCTION public.get_badges_video_feed(
  _badge_ids uuid[],
  _seed text DEFAULT 'owm',
  _limit integer DEFAULT 60,
  _offset integer DEFAULT 0,
  _city_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  id text,
  source text,
  is_generic boolean,
  url text,
  title text,
  description text,
  price text,
  thumbnail_url text,
  business_id uuid,
  business_name text,
  business_logo_url text,
  business_logo_bg text,
  group_key text,
  feed_position bigint,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    COALESCE(d.linked_business_id, d.business_id) AS business_id
  FROM public.business_documents d
  JOIN public.business_document_badges bdb
    ON bdb.document_id = d.id AND bdb.badge_id = ANY(_badge_ids)
  WHERE d.type = 'video'
    AND lower(COALESCE(d.orientation, '')) = 'portrait'
    AND COALESCE(d.business_is_active, true) = true
    AND (
      _city_ids IS NULL
      OR EXISTS (SELECT 1 FROM public.business_document_cities c WHERE c.document_id = d.id AND c.city_id = ANY(_city_ids))
    )
),
yt AS (
  SELECT DISTINCT
    y.id::text AS id,
    'youtube'::text AS source,
    false AS is_generic,
    ('https://www.youtube.com/shorts/' || y.video_id) AS url,
    y.title AS title,
    NULL::text AS description,
    NULL::text AS price,
    COALESCE(NULLIF(y.custom_thumbnail_url, ''), NULLIF(y.thumbnail, ''), 'https://i.ytimg.com/vi/' || y.video_id || '/hqdefault.jpg') AS thumbnail_url,
    y.business_id AS business_id
  FROM public.business_youtube_videos y
  JOIN public.business_youtube_video_badges yb
    ON yb.youtube_video_id = y.id AND yb.badge_id = ANY(_badge_ids)
  WHERE y.is_short IS TRUE
    AND COALESCE(y.is_visible, true) = true
    AND COALESCE(y.business_is_active, true) = true
    AND COALESCE(y.video_id, '') <> ''
    AND (
      _city_ids IS NULL
      OR EXISTS (SELECT 1 FROM public.business_youtube_video_cities c WHERE c.youtube_video_id = y.id AND c.city_id = ANY(_city_ids))
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
    ) AS business_id
  FROM public.generic_videos g
  JOIN public.generic_video_badges gvb
    ON gvb.generic_video_id = g.id AND gvb.badge_id = ANY(_badge_ids)
  WHERE COALESCE(g.url, '') <> ''
    AND (
      lower(COALESCE(g.orientation, '')) = 'portrait'
      OR (g.media_height IS NOT NULL AND g.media_width IS NOT NULL AND g.media_height > g.media_width)
    )
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
    row_number() OVER (ORDER BY gr.pos_in_group, gr.h) AS feed_position,
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
  o.group_key,
  o.feed_position,
  o.total_count
FROM ordered o
LEFT JOIN public.businesses b ON b.id = o.business_id
ORDER BY o.feed_position
OFFSET GREATEST(COALESCE(_offset, 0), 0)
LIMIT LEAST(GREATEST(COALESCE(_limit, 60), 1), 300);
$$;

GRANT EXECUTE ON FUNCTION public.get_badges_video_feed(uuid[], text, integer, integer, uuid[]) TO anon, authenticated, service_role;