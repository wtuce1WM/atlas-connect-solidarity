DROP VIEW IF EXISTS public.knowledge_entries_public;
DROP POLICY IF EXISTS "Public can read knowledge entries linked to businesses" ON public.knowledge_entries;

-- Ensure no public column-level access remains on the notes field
REVOKE SELECT (notes) ON public.knowledge_entries FROM public;

-- Keep staff and service-role access intact
GRANT SELECT ON public.knowledge_entries TO authenticated;
GRANT ALL ON public.knowledge_entries TO service_role;