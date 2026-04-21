ALTER TABLE public.businesses ALTER COLUMN front_video_count SET DEFAULT 1;

UPDATE public.businesses SET front_video_count = 1 WHERE front_video_count IS NULL OR front_video_count = 0;

ALTER TABLE public.businesses DROP CONSTRAINT IF EXISTS businesses_front_video_count_check;

ALTER TABLE public.businesses ADD CONSTRAINT businesses_front_video_count_check CHECK (front_video_count >= 1 AND front_video_count <= 9);