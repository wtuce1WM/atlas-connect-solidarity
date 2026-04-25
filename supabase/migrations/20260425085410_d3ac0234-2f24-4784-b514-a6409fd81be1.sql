CREATE OR REPLACE FUNCTION public.replace_business_documents(p_business_id uuid, p_docs jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

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
        subcategory_id, service_id, city, neighborhood,
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
        (doc->>'city')::text,
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
        city = EXCLUDED.city,
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
  ELSE
    result := '[]'::jsonb;
  END IF;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;