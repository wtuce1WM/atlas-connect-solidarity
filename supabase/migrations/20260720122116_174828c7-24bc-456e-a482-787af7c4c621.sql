ALTER TABLE public.video_jobs
  DROP CONSTRAINT IF EXISTS video_jobs_duration_sec_check;

ALTER TABLE public.video_jobs
  ADD CONSTRAINT video_jobs_duration_sec_check
  CHECK (duration_sec BETWEEN 10 AND 60);