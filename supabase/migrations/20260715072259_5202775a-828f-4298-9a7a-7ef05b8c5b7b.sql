DROP POLICY IF EXISTS "Anyone can insert business events" ON public.business_events;

CREATE POLICY "Anyone can insert business events"
ON public.business_events
FOR INSERT
TO anon, authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());