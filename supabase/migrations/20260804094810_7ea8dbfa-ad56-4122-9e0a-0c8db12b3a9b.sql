ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS kp_city text,
  ADD COLUMN IF NOT EXISTS kp_city_2 text;