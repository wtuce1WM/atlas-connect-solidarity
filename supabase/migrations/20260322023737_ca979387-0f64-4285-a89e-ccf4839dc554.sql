ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS trustpilot_url text,
  ADD COLUMN IF NOT EXISTS trustpilot_rating numeric,
  ADD COLUMN IF NOT EXISTS trustpilot_review_count integer;