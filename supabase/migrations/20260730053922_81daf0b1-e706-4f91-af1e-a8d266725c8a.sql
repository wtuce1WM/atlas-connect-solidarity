ALTER TABLE public.video_jobs ADD COLUMN IF NOT EXISTS title text;

DROP POLICY IF EXISTS video_jobs_update_own ON public.video_jobs;
CREATE POLICY video_jobs_update_own ON public.video_jobs
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());