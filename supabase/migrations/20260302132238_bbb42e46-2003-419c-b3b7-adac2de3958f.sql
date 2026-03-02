CREATE POLICY "Public can read knowledge entries linked to businesses"
ON public.knowledge_entries
FOR SELECT
USING (business_id IS NOT NULL AND is_active = true);