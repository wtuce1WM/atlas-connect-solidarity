ALTER TABLE public.business_documents
  ADD COLUMN IF NOT EXISTS media_width integer,
  ADD COLUMN IF NOT EXISTS media_height integer,
  ADD COLUMN IF NOT EXISTS orientation text,
  ADD COLUMN IF NOT EXISTS orientation_checked_at timestamptz;

ALTER TABLE public.generic_videos
  ADD COLUMN IF NOT EXISTS media_width integer,
  ADD COLUMN IF NOT EXISTS media_height integer,
  ADD COLUMN IF NOT EXISTS orientation text,
  ADD COLUMN IF NOT EXISTS orientation_checked_at timestamptz;

CREATE INDEX IF NOT EXISTS business_documents_video_orientation_idx
  ON public.business_documents (orientation)
  WHERE type = 'video';

CREATE INDEX IF NOT EXISTS generic_videos_orientation_idx
  ON public.generic_videos (orientation);