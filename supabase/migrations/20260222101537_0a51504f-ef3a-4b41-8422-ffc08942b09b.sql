ALTER TABLE public.businesses 
  ADD COLUMN destination_hook text DEFAULT NULL,
  ADD COLUMN destination_description text DEFAULT NULL;

ALTER TABLE public.business_destinations 
  DROP COLUMN IF EXISTS hook,
  DROP COLUMN IF EXISTS description;