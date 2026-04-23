CREATE TABLE public.front_structure_homepage_extra_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  badge_id uuid REFERENCES public.badges(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.front_structure_homepage_extra_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view extra cards"
ON public.front_structure_homepage_extra_cards FOR SELECT
USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert extra cards"
ON public.front_structure_homepage_extra_cards FOR INSERT
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update extra cards"
ON public.front_structure_homepage_extra_cards FOR UPDATE
USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete extra cards"
ON public.front_structure_homepage_extra_cards FOR DELETE
USING (public.is_staff(auth.uid()));

CREATE TRIGGER update_extra_cards_updated_at
BEFORE UPDATE ON public.front_structure_homepage_extra_cards
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_extra_cards_city ON public.front_structure_homepage_extra_cards(city, sort_order);