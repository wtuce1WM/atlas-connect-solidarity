ALTER TABLE public.events ADD COLUMN google_maps_url text DEFAULT NULL;
ALTER TABLE public.events ADD COLUMN latitude double precision DEFAULT NULL;
ALTER TABLE public.events ADD COLUMN longitude double precision DEFAULT NULL;