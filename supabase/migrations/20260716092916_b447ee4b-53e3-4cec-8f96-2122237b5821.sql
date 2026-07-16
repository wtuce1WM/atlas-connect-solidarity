DROP POLICY IF EXISTS "Public can read knowledge entries linked to businesses" ON public.knowledge_entries;

CREATE OR REPLACE VIEW public.knowledge_entries_public AS
SELECT
  id,
  created_at,
  updated_at,
  category,
  title,
  content,
  tags,
  source,
  business_id,
  city_id,
  destination_id,
  neighborhood_id,
  point_of_interest_id,
  is_active
FROM public.knowledge_entries
WHERE business_id IS NOT NULL AND is_active = true;

GRANT SELECT ON public.knowledge_entries_public TO anon;
GRANT SELECT ON public.knowledge_entries_public TO authenticated;

GRANT SELECT ON public.knowledge_entries TO authenticated;
GRANT ALL ON public.knowledge_entries TO service_role;