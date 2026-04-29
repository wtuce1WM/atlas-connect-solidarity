ALTER TABLE public.business_youtube_videos
  ADD COLUMN IF NOT EXISTS custom_thumbnail_url text,
  ADD COLUMN IF NOT EXISTS thumbnail_locked boolean NOT NULL DEFAULT false;