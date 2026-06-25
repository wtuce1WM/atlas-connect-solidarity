CREATE POLICY "Anyone can update video jobs" ON public.video_jobs FOR UPDATE TO public USING (true) WITH CHECK (true);
GRANT UPDATE ON public.video_jobs TO anon, authenticated;