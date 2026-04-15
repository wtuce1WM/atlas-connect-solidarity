
ALTER TABLE public.destinations
  ADD COLUMN IF NOT EXISTS google_maps_url text,
  ADD COLUMN IF NOT EXISTS google_reviews_url text,
  ADD COLUMN IF NOT EXISTS google_rating numeric,
  ADD COLUMN IF NOT EXISTS google_review_count integer;
