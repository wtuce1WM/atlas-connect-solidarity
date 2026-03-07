ALTER TABLE public.search_synonyms 
  ADD COLUMN IF NOT EXISTS engagement_filters text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS commodity_filters text[] NOT NULL DEFAULT '{}'::text[];