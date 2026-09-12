ALTER TABLE public.hotel_mappings
  ADD COLUMN IF NOT EXISTS has_serp_price boolean,
  ADD COLUMN IF NOT EXISTS serp_price_checked_at timestamptz;

CREATE INDEX IF NOT EXISTS hotel_mappings_city_price_idx
  ON public.hotel_mappings (city, has_serp_price);