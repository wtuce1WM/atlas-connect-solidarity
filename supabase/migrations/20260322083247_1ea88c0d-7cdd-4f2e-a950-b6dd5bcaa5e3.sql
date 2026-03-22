ALTER TABLE public.businesses
  ADD COLUMN tourradar_url text,
  ADD COLUMN tourradar_rating numeric,
  ADD COLUMN tourradar_review_count integer;