DROP POLICY IF EXISTS "Service role can insert search logs" ON public.search_logs;
CREATE POLICY "Service role can insert search logs" ON public.search_logs
  FOR INSERT TO public
  WITH CHECK (auth.role() = 'service_role');