-- Phase 3a: Fix replace_business_documents RPC to use city_id (UUID) for business_document_cities

CREATE OR REPLACE FUNCTION public.replace_business_documents(p_business_id uuid, p_docs jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  biz_city text;
BEGIN
  IF NOT is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT city INTO biz_city FROM public.businesses WHERE id = p_business_id;

  DELETE FROM public.business_document_badges
  WHERE document_id IN (
    SELECT id FROM public.business_documents WHERE business_id = p_business_id
  );

  DELETE FROM public.business_document_cities
  WHERE document_id IN (
    SELECT id FROM public.business_documents WHERE business_id = p_business_id
  );

  DELETE FROM public.business_documents bd
  WHERE bd.business_id = p_business_id
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_docs) AS doc
      WHERE NULLIF(doc->>'id', '')::uuid = bd.id
    );

  IF jsonb_array_length(p_docs) > 0 THEN
    WITH upserted AS (
      INSERT INTO public.business_documents (
        id, business_id, type, url, name, language, icon, sort_order,
        front_sort_order, show_on_front, popup, force_external,
        description, poi_id, destination_id, linked_business_id,
        subcategory_id, service_id, neighborhood,
        price, price_type, thumbnail_url, event_id, hide_logo,
        instagram_account, instagram_url, instagram_video_url,
        tiktok_account, tiktok_url, tiktok_video_url,
        youtube_account, youtube_url, youtube_video_url
      )
      SELECT
        COALESCE(NULLIF(doc->>'id', '')::uuid, gen_random_uuid()),
        p_business_id,
        (doc->>'type')::text,
        (doc->>'url')::text,
        (doc->>'name')::text,
        (doc->>'language')::text,
        (doc->>'icon')::text,
        COALESCE((doc->>'sort_order')::int, 0),
        COALESCE((doc->>'front_sort_order')::int, 0),
        COALESCE((doc->>'show_on_front')::boolean, false),
        COALESCE((doc->>'popup')::boolean, false),
        COALESCE((doc->>'force_external')::boolean, false),
        (doc->>'description')::text,
        NULLIF(doc->>'poi_id', '')::uuid,
        NULLIF(doc->>'destination_id', '')::uuid,
        NULLIF(doc->>'linked_business_id', '')::uuid,
        NULLIF(doc->>'subcategory_id', '')::uuid,
        NULLIF(doc->>'service_id', '')::uuid,
        (doc->>'neighborhood')::text,
        (doc->>'price')::text,
        (doc->>'price_type')::text,
        (doc->>'thumbnail_url')::text,
        NULLIF(doc->>'event_id', '')::uuid,
        COALESCE((doc->>'hide_logo')::boolean, false),
        NULLIF(doc->>'instagram_account', '')::text,
        NULLIF(doc->>'instagram_url', '')::text,
        NULLIF(doc->>'instagram_video_url', '')::text,
        NULLIF(doc->>'tiktok_account', '')::text,
        NULLIF(doc->>'tiktok_url', '')::text,
        NULLIF(doc->>'tiktok_video_url', '')::text,
        NULLIF(doc->>'youtube_account', '')::text,
        NULLIF(doc->>'youtube_url', '')::text,
        NULLIF(doc->>'youtube_video_url', '')::text
      FROM jsonb_array_elements(p_docs) AS doc
      ON CONFLICT (id) DO UPDATE SET
        type = EXCLUDED.type,
        url = EXCLUDED.url,
        name = EXCLUDED.name,
        language = EXCLUDED.language,
        icon = EXCLUDED.icon,
        sort_order = EXCLUDED.sort_order,
        front_sort_order = EXCLUDED.front_sort_order,
        show_on_front = EXCLUDED.show_on_front,
        popup = EXCLUDED.popup,
        force_external = EXCLUDED.force_external,
        description = EXCLUDED.description,
        poi_id = EXCLUDED.poi_id,
        destination_id = EXCLUDED.destination_id,
        linked_business_id = EXCLUDED.linked_business_id,
        subcategory_id = EXCLUDED.subcategory_id,
        service_id = EXCLUDED.service_id,
        neighborhood = EXCLUDED.neighborhood,
        price = EXCLUDED.price,
        price_type = EXCLUDED.price_type,
        thumbnail_url = EXCLUDED.thumbnail_url,
        event_id = EXCLUDED.event_id,
        hide_logo = EXCLUDED.hide_logo,
        instagram_account = EXCLUDED.instagram_account,
        instagram_url = EXCLUDED.instagram_url,
        instagram_video_url = EXCLUDED.instagram_video_url,
        tiktok_account = EXCLUDED.tiktok_account,
        tiktok_url = EXCLUDED.tiktok_url,
        tiktok_video_url = EXCLUDED.tiktok_video_url,
        youtube_account = EXCLUDED.youtube_account,
        youtube_url = EXCLUDED.youtube_url,
        youtube_video_url = EXCLUDED.youtube_video_url
      WHERE public.business_documents.business_id = p_business_id
      RETURNING id, type
    )
    SELECT jsonb_agg(jsonb_build_object('id', id, 'type', type))
    INTO result
    FROM upserted;

    -- Re-populate business_document_cities (city_id UUID) from the JSON payload.
    -- Each doc may carry a "cities" array of city names OR an explicit "city_ids" array.
    -- Fallback: legacy "city" string, then business default city. Resolve names via cities table.
    INSERT INTO public.business_document_cities (document_id, city_id)
    SELECT DISTINCT
      NULLIF(doc->>'id', '')::uuid AS doc_id,
      city_uuid
    FROM jsonb_array_elements(p_docs) AS doc
    CROSS JOIN LATERAL (
      -- Direct city_ids array
      SELECT (value::text)::uuid AS city_uuid
      FROM jsonb_array_elements_text(
        CASE WHEN jsonb_typeof(doc->'city_ids') = 'array' THEN doc->'city_ids' ELSE '[]'::jsonb END
      )
      UNION
      -- Resolve city names from "cities" array
      SELECT c.id
      FROM jsonb_array_elements_text(
        CASE WHEN jsonb_typeof(doc->'cities') = 'array' THEN doc->'cities' ELSE '[]'::jsonb END
      ) AS cn
      JOIN public.cities c
        ON lower(c.name_fr) = lower(cn) OR lower(c.name_en) = lower(cn) OR lower(c.name_ar) = lower(cn)
      UNION
      -- Resolve from legacy "city" string
      SELECT c.id
      FROM public.cities c
      WHERE NULLIF(doc->>'city', '') IS NOT NULL
        AND jsonb_typeof(doc->'cities') IS DISTINCT FROM 'array'
        AND jsonb_typeof(doc->'city_ids') IS DISTINCT FROM 'array'
        AND (lower(c.name_fr) = lower(doc->>'city')
          OR lower(c.name_en) = lower(doc->>'city')
          OR lower(c.name_ar) = lower(doc->>'city'))
      UNION
      -- Fallback: business default city
      SELECT c.id
      FROM public.cities c
      WHERE biz_city IS NOT NULL
        AND jsonb_typeof(doc->'cities') IS DISTINCT FROM 'array'
        AND jsonb_typeof(doc->'city_ids') IS DISTINCT FROM 'array'
        AND NULLIF(doc->>'city', '') IS NULL
        AND (lower(c.name_fr) = lower(biz_city)
          OR lower(c.name_en) = lower(biz_city)
          OR lower(c.name_ar) = lower(biz_city))
    ) resolved
    WHERE NULLIF(doc->>'id', '')::uuid IS NOT NULL
      AND city_uuid IS NOT NULL
    ON CONFLICT DO NOTHING;
  ELSE
    result := '[]'::jsonb;
  END IF;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$function$;

-- Phase 3b: auto-sync legacy business_documents.city from business_document_cities

CREATE OR REPLACE FUNCTION public.sync_business_document_legacy_city()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  affected_doc_id uuid;
  new_city text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    affected_doc_id := OLD.document_id;
  ELSE
    affected_doc_id := NEW.document_id;
  END IF;

  SELECT c.name_fr INTO new_city
  FROM public.business_document_cities bdc
  JOIN public.cities c ON c.id = bdc.city_id
  WHERE bdc.document_id = affected_doc_id
  ORDER BY c.name_fr ASC
  LIMIT 1;

  UPDATE public.business_documents
  SET city = new_city
  WHERE id = affected_doc_id
    AND city IS DISTINCT FROM new_city;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_legacy_city_ins ON public.business_document_cities;
DROP TRIGGER IF EXISTS trg_sync_legacy_city_upd ON public.business_document_cities;
DROP TRIGGER IF EXISTS trg_sync_legacy_city_del ON public.business_document_cities;

CREATE TRIGGER trg_sync_legacy_city_ins
AFTER INSERT ON public.business_document_cities
FOR EACH ROW EXECUTE FUNCTION public.sync_business_document_legacy_city();

CREATE TRIGGER trg_sync_legacy_city_upd
AFTER UPDATE ON public.business_document_cities
FOR EACH ROW EXECUTE FUNCTION public.sync_business_document_legacy_city();

CREATE TRIGGER trg_sync_legacy_city_del
AFTER DELETE ON public.business_document_cities
FOR EACH ROW EXECUTE FUNCTION public.sync_business_document_legacy_city();

-- Initial sync: refresh legacy city for every doc that has multi-city links
WITH first_city AS (
  SELECT bdc.document_id, MIN(c.name_fr) AS name_fr
  FROM public.business_document_cities bdc
  JOIN public.cities c ON c.id = bdc.city_id
  GROUP BY bdc.document_id
)
UPDATE public.business_documents bd
SET city = fc.name_fr
FROM first_city fc
WHERE bd.id = fc.document_id
  AND bd.city IS DISTINCT FROM fc.name_fr;