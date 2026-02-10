
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS tripadvisor_rating numeric NULL,
  ADD COLUMN IF NOT EXISTS tripadvisor_review_count integer NULL,
  ADD COLUMN IF NOT EXISTS restaurant_guru_rating numeric NULL,
  ADD COLUMN IF NOT EXISTS restaurant_guru_review_count integer NULL,
  ADD COLUMN IF NOT EXISTS google_rating numeric NULL,
  ADD COLUMN IF NOT EXISTS google_review_count integer NULL;
