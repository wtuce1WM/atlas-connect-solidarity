
ALTER TABLE public.businesses
  ADD COLUMN getyourguide_rating numeric NULL,
  ADD COLUMN getyourguide_review_count integer NULL,
  ADD COLUMN viator_rating numeric NULL,
  ADD COLUMN viator_review_count integer NULL;
