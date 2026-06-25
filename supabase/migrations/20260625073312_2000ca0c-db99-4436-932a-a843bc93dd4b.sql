ALTER TABLE public.video_jobs
  ADD COLUMN IF NOT EXISTS template_id text,
  ADD COLUMN IF NOT EXISTS template_props jsonb DEFAULT '{}'::jsonb;