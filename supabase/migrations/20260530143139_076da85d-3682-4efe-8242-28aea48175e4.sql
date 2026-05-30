ALTER TABLE public.generic_video_pois ADD COLUMN IF NOT EXISTS timeframe_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE public.generic_video_businesses ADD COLUMN IF NOT EXISTS timeframe_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE public.generic_video_destinations ADD COLUMN IF NOT EXISTS timeframe_enabled boolean NOT NULL DEFAULT true;