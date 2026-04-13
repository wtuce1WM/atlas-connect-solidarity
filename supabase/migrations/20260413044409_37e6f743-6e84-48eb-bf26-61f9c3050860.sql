CREATE TABLE public.event_businesses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (event_id, business_id)
);

ALTER TABLE public.event_businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event businesses are viewable by everyone"
  ON public.event_businesses FOR SELECT
  USING (true);

CREATE POLICY "Staff can insert event businesses"
  ON public.event_businesses FOR INSERT
  WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can delete event businesses"
  ON public.event_businesses FOR DELETE
  USING (is_staff(auth.uid()));

CREATE POLICY "Staff can update event businesses"
  ON public.event_businesses FOR UPDATE
  USING (is_staff(auth.uid()));