GRANT SELECT ON public.business_events TO authenticated;
GRANT INSERT ON public.business_events TO anon, authenticated;
GRANT ALL ON public.business_events TO service_role;

CREATE POLICY "Staff can read business events"
ON public.business_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can log business events"
ON public.business_events FOR INSERT TO anon, authenticated
WITH CHECK (true);