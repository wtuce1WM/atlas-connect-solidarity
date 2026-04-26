CREATE TABLE public.front_structure_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  front_structure_id uuid NOT NULL REFERENCES public.front_structure(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (front_structure_id, badge_id)
);

CREATE INDEX idx_front_structure_badges_fs ON public.front_structure_badges(front_structure_id);
CREATE INDEX idx_front_structure_badges_badge ON public.front_structure_badges(badge_id);

ALTER TABLE public.front_structure_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "front_structure_badges public read"
  ON public.front_structure_badges FOR SELECT
  USING (true);

CREATE POLICY "front_structure_badges staff insert"
  ON public.front_structure_badges FOR INSERT
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "front_structure_badges staff update"
  ON public.front_structure_badges FOR UPDATE
  USING (public.is_staff(auth.uid()));

CREATE POLICY "front_structure_badges staff delete"
  ON public.front_structure_badges FOR DELETE
  USING (public.is_staff(auth.uid()));