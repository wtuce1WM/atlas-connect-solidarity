
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  hook TEXT,
  description TEXT,
  start_date DATE,
  end_date DATE,
  images TEXT[] DEFAULT '{}',
  videos TEXT[] DEFAULT '{}',
  kp_regroupement TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are publicly readable"
ON public.events FOR SELECT
USING (true);

CREATE POLICY "Staff can insert events"
ON public.events FOR INSERT
TO authenticated
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update events"
ON public.events FOR UPDATE
TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete events"
ON public.events FOR DELETE
TO authenticated
USING (public.is_staff(auth.uid()));

CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
