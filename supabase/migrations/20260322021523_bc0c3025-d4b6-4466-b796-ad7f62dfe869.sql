ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS avis_verifies_url text,
  ADD COLUMN IF NOT EXISTS avis_verifies_rating numeric,
  ADD COLUMN IF NOT EXISTS avis_verifies_review_count integer;

-- Also add to the view if it exists
DO $$
BEGIN
  EXECUTE 'CREATE OR REPLACE VIEW public.businesses_public AS SELECT * FROM public.businesses WHERE is_active = true';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;