ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS map_bg_color text,
  ADD COLUMN IF NOT EXISTS default_poi_business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL;