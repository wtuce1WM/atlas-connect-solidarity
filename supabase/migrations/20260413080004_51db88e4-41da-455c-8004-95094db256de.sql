
ALTER TABLE public.generic_video_pois ADD COLUMN sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE public.generic_video_businesses ADD COLUMN sort_order integer NOT NULL DEFAULT 0;
