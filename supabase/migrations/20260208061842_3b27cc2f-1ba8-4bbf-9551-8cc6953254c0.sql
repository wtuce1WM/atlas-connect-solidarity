-- Change zone from single text to array for multiple zones
ALTER TABLE public.sponsors DROP CONSTRAINT sponsors_zone_check;
ALTER TABLE public.sponsors ALTER COLUMN zone TYPE TEXT[] USING ARRAY[zone];
ALTER TABLE public.sponsors RENAME COLUMN zone TO zones;
ALTER TABLE public.sponsors ADD CONSTRAINT sponsors_zones_check CHECK (zones <@ ARRAY['home', 'category', 'city']::text[]);