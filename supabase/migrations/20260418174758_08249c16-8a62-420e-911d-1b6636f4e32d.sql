ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS google_place_id text,
ADD COLUMN IF NOT EXISTS google_review_url text;