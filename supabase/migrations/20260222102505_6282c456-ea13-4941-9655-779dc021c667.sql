ALTER TABLE public.businesses
  ADD COLUMN poi_hook text DEFAULT NULL,
  ADD COLUMN poi_description text DEFAULT NULL;