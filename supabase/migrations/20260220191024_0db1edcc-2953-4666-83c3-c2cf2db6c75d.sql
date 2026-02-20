-- Add keywords array to services table for synonyms/related terms
ALTER TABLE public.services ADD COLUMN keywords text[] DEFAULT '{}'::text[];

-- Add a comment for documentation
COMMENT ON COLUMN public.services.keywords IS 'Synonyms and related search terms for this service (e.g. huîtres, moules for Coquillages)';