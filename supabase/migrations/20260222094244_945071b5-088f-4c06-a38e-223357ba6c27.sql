-- Add a JSONB column for poissonnerie-specific details
ALTER TABLE public.businesses 
ADD COLUMN poissonnerie_details jsonb DEFAULT NULL;

COMMENT ON COLUMN public.businesses.poissonnerie_details IS 'Specific details for Poissonnerie subcategory: provenance, freshness, preparation services';