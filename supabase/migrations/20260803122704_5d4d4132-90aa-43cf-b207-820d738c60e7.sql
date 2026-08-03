ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS poi_radius_km numeric NOT NULL DEFAULT 10;
UPDATE public.businesses SET poi_radius_km = 10 WHERE poi_radius_km IS NULL;