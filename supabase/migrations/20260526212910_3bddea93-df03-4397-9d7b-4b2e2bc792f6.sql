
-- Slugify helper
CREATE OR REPLACE FUNCTION public.slugify(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT trim(both '-' from regexp_replace(
    lower(unaccent(coalesce(input,''))),
    '[^a-z0-9]+', '-', 'g'
  ));
$$;

-- Ensure unaccent extension exists
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Reserved slugs that must never be used as vanity URLs
WITH reserved AS (
  SELECT unnest(ARRAY[
    '','videos','ancien-index','business','city','category','service','search',
    'staff','affiliates','devenir-affilie','mission','contact','blog','neighborhood',
    'carte','subcategory','hotels','club','search-analytics','destination',
    'conditions-generales','unsubscribe','fiche','test','install','corporate'
  ]) AS slug
),
-- Build candidate slugs for businesses
biz_candidates AS (
  SELECT
    b.id,
    public.slugify(b.name) AS base_slug,
    ROW_NUMBER() OVER (PARTITION BY public.slugify(b.name) ORDER BY b.created_at NULLS LAST, b.id) AS rn
  FROM public.businesses b
  WHERE b.is_active = true
    AND b.name IS NOT NULL
    AND public.slugify(b.name) <> ''
),
biz_final AS (
  SELECT
    id,
    CASE WHEN rn = 1 THEN base_slug ELSE base_slug || '-' || rn::text END AS slug
  FROM biz_candidates
),
-- Build candidate slugs for destinations
dest_candidates AS (
  SELECT
    d.id,
    public.slugify(d.name_fr) AS base_slug,
    ROW_NUMBER() OVER (PARTITION BY public.slugify(d.name_fr) ORDER BY d.id) AS rn
  FROM public.destinations d
  WHERE d.name_fr IS NOT NULL
    AND public.slugify(d.name_fr) <> ''
),
dest_final AS (
  SELECT
    id,
    CASE WHEN rn = 1 THEN base_slug ELSE base_slug || '-' || rn::text END AS slug
  FROM dest_candidates
)
INSERT INTO public.vanity_urls (slug, target_type, target_id)
SELECT slug, 'business', id FROM biz_final
WHERE slug NOT IN (SELECT slug FROM reserved)
UNION ALL
SELECT slug, 'destination', id FROM dest_final
WHERE slug NOT IN (SELECT slug FROM reserved)
  AND slug NOT IN (SELECT slug FROM biz_final)
ON CONFLICT (slug) DO NOTHING;
