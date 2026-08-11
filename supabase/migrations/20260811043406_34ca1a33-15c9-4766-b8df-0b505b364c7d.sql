CREATE OR REPLACE FUNCTION public.replace_business_documents(
  p_business_id uuid,
  p_docs jsonb,
  p_managed_types text[] DEFAULT ARRAY['menu','flipbook','external_link','video']::text[]
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  biz_city text;
  docs_with_ids jsonb;
  managed text[];
BEGIN
  IF NOT is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  managed := COALESCE(p_managed_types, ARRAY['menu','flipbook','external_link','video']::text[]);

  SELECT city INTO biz_city FROM public.businesses WHERE id = p_business_id;

  SELECT COALESCE(jsonb_agg(
    CASE
      WHEN NULLIF(doc->>'id','') IS NULL THEN doc || jsonb_build_object('id', gen_random_uuid()::text)
      ELSE doc
    END
  ), '[]'::jsonb)
  INTO docs_with_ids
  FROM jsonb_array_elements(p_docs) AS doc;

  DELETE FROM public.business_document_badges
  WHERE document_id IN (
    SELECT id FROM public.business_documents
    WHERE business_id = p_business_id AND type = ANY(managed)
  );

  DELETE FROM public.business_document_cities
  WHERE document_id IN (
    SELECT id FROM public.business_documents
    WHERE business_id = p_business_id AND type = ANY(managed)
  );

  DELETE FROM public.business_documents bd
  WHERE bd.business_id = p_business_id
    AND bd.type = ANY(managed)
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(docs_with_ids) AS doc
      WHERE NULLIF(doc->>'id', '')::uuid = bd.id
    );

  IF jsonb_array_length(docs_with_ids) > 0 THEN
    WITH upserted AS (
      INSERT INTO public.business_documents (
        id, business_id, type, url, name, language, icon, sort_order,
        front_sort_order, show_on_front, popup, force_external,
        description, poi_id, destination_id, linked_business_id,
        subcategory_id, service_id, neighborhood,
        price, price_type, thumbnail_url, thumbnail_locked, event_id, hide_logo,
        instagram_account, instagram_url, instagram_video_url,
        tiktok_account, tiktok_url, tiktok_video_url,
        youtube_account, youtube_url, youtube_video_url
      )
      SELECT
        (doc->>'id')::uuid,
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
        COALESCE((doc->>'thumbnail_locked')::boolean, false),
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
      FROM jsonb_array_elements(docs_with_ids) AS doc
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
        thumbnail_url = CASE
          WHEN public.business_documents.thumbnail_locked = true AND EXCLUDED.thumbnail_locked = false
          THEN public.business_documents.thumbnail_url
          ELSE EXCLUDED.thumbnail_url
        END,
        thumbnail_locked = CASE
          WHEN public.business_documents.thumbnail_locked = true AND EXCLUDED.thumbnail_locked = false
          THEN true
          ELSE EXCLUDED.thumbnail_locked
        END,
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

    INSERT INTO public.business_document_cities (document_id, city_id)
    SELECT DISTINCT
      (doc->>'id')::uuid AS doc_id,
      city_uuid
    FROM jsonb_array_elements(docs_with_ids) AS doc
    CROSS JOIN LATERAL (
      SELECT (value::text)::uuid AS city_uuid
      FROM jsonb_array_elements_text(
        CASE WHEN jsonb_typeof(doc->'city_ids') = 'array' THEN doc->'city_ids' ELSE '[]'::jsonb END
      )
      UNION
      SELECT c.id
      FROM jsonb_array_elements_text(
        CASE WHEN jsonb_typeof(doc->'cities') = 'array' THEN doc->'cities' ELSE '[]'::jsonb END
      ) AS cn
      JOIN public.cities c
        ON lower(c.name_fr) = lower(cn) OR lower(c.name_en) = lower(cn) OR lower(c.name_ar) = lower(cn)
      UNION
      SELECT c.id
      FROM public.cities c
      WHERE NULLIF(doc->>'city', '') IS NOT NULL
        AND jsonb_typeof(doc->'cities') IS DISTINCT FROM 'array'
        AND jsonb_typeof(doc->'city_ids') IS DISTINCT FROM 'array'
        AND (lower(c.name_fr) = lower(doc->>'city')
          OR lower(c.name_en) = lower(doc->>'city')
          OR lower(c.name_ar) = lower(doc->>'city'))
      UNION
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
    WHERE (doc->>'id')::uuid IS NOT NULL
      AND city_uuid IS NOT NULL
    ON CONFLICT DO NOTHING;
  ELSE
    result := '[]'::jsonb;
  END IF;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.replace_business_documents(uuid, jsonb, text[]) TO authenticated;