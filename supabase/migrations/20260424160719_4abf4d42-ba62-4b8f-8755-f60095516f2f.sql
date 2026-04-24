CREATE TABLE public.event_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, badge_id)
);

CREATE INDEX idx_event_badges_event_id ON public.event_badges(event_id);
CREATE INDEX idx_event_badges_badge_id ON public.event_badges(badge_id);

ALTER TABLE public.event_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event badges are viewable by everyone"
ON public.event_badges FOR SELECT
USING (true);

CREATE POLICY "Staff can insert event badges"
ON public.event_badges FOR INSERT
WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update event badges"
ON public.event_badges FOR UPDATE
USING (is_staff(auth.uid()));

CREATE POLICY "Staff can delete event badges"
ON public.event_badges FOR DELETE
USING (is_staff(auth.uid()));