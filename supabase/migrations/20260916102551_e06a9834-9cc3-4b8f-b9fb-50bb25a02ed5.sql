CREATE OR REPLACE FUNCTION public.get_city_video_business_ids(_city_id uuid, _city_name text DEFAULT NULL)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT b.id
  FROM business_document_cities c
  JOIN business_documents d ON d.id = c.document_id AND d.type = 'video'
  JOIN businesses b ON b.id = d.business_id
  WHERE c.city_id = _city_id
    AND b.is_active = true
    AND (_city_name IS NULL OR b.city IS NULL OR b.city NOT ILIKE _city_name)
$$;

GRANT EXECUTE ON FUNCTION public.get_city_video_business_ids(uuid, text) TO anon, authenticated, service_role;