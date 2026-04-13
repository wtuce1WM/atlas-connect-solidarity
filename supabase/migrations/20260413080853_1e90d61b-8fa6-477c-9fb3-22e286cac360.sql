
ALTER TABLE public.generic_video_pois ADD COLUMN start_time numeric DEFAULT NULL;
ALTER TABLE public.generic_video_pois ADD COLUMN end_time numeric DEFAULT NULL;

ALTER TABLE public.generic_video_businesses ADD COLUMN start_time numeric DEFAULT NULL;
ALTER TABLE public.generic_video_businesses ADD COLUMN end_time numeric DEFAULT NULL;
