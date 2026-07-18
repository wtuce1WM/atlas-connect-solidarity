
-- Tighten video_jobs INSERT: non-staff must own the target business
DROP POLICY IF EXISTS video_jobs_insert_own ON public.video_jobs;

CREATE POLICY video_jobs_insert_own
ON public.video_jobs
FOR INSERT
TO authenticated
WITH CHECK (
  (user_id IS NULL OR auth.uid() = user_id)
  AND (
    public.is_staff(auth.uid())
    OR (business_id IS NOT NULL AND public.is_own_affiliate_business(auth.uid(), business_id))
  )
);
