
-- Add internal_notes column to destinations
ALTER TABLE public.destinations ADD COLUMN internal_notes text;

-- Convert region from text to text[] to support multiple regions
ALTER TABLE public.destinations 
  ALTER COLUMN region TYPE text[] 
  USING CASE WHEN region IS NOT NULL THEN ARRAY[region] ELSE '{}'::text[] END;

-- Set default for region column
ALTER TABLE public.destinations ALTER COLUMN region SET DEFAULT '{}'::text[];
