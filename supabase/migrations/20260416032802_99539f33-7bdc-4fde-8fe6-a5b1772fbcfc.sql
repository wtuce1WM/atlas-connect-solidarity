
CREATE OR REPLACE FUNCTION public.replace_business_documents(
  p_business_id uuid,
  p_docs jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Only staff can call this
  IF NOT is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Delete badge associations for existing documents
  DELETE FROM public.business_document_badges
  WHERE document_id IN (
    SELECT id FROM public.business_documents WHERE business_id = p_business_id
  );

  -- Delete existing documents
  DELETE FROM public.business_documents WHERE business_id = p_business_id;

  -- Insert new documents if any
  IF jsonb_array_length(p_docs) > 0 THEN
    WITH inserted AS (
      INSERT INTO public.business_documents (
        business_id, type, url, name, language, icon, sort_order, 
        front_sort_order, show_on_front, popup, force_external,
        description, poi_id, destination_id, linked_business_id,
        subcategory_id, service_id, city, neighborhood,
        price, price_type, thumbnail_url, event_id
      )
      SELECT
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
        NULLIF(doc->>'event_id', '')::uuid
      FROM jsonb_array_elements(p_docs) AS doc
      RETURNING id, type
    )
    SELECT jsonb_agg(jsonb_build_object('id', id, 'type', type))
    INTO result
    FROM inserted;
  ELSE
    result := '[]'::jsonb;
  END IF;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;
