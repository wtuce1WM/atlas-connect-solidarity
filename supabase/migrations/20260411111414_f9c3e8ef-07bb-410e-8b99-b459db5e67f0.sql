
-- Event types lookup table
CREATE TABLE public.event_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.event_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read event_types" ON public.event_types FOR SELECT USING (true);
CREATE POLICY "Staff can insert event_types" ON public.event_types FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update event_types" ON public.event_types FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete event_types" ON public.event_types FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- Seed default types (alphabetical)
INSERT INTO public.event_types (name) VALUES
  ('Cinéma'),
  ('Concert'),
  ('Exposition permanente'),
  ('Exposition temporaire'),
  ('Marché'),
  ('Marché aux puces'),
  ('Théâtre');

-- Add type column to events
ALTER TABLE public.events ADD COLUMN type TEXT;
