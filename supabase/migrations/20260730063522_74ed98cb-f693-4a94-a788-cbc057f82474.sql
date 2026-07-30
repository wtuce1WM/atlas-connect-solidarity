ALTER TABLE public.video_jobs
  ADD COLUMN IF NOT EXISTS notify_email boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_email_to text;