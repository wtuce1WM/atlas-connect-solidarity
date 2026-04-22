
ALTER TABLE public.business_documents
  ADD COLUMN IF NOT EXISTS instagram_account TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_video_url TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_account TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_url TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_video_url TEXT,
  ADD COLUMN IF NOT EXISTS youtube_account TEXT,
  ADD COLUMN IF NOT EXISTS youtube_url TEXT,
  ADD COLUMN IF NOT EXISTS youtube_video_url TEXT;
