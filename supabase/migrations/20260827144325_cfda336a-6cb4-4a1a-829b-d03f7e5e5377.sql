CREATE TABLE public.front_structure_homepage_card_badges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city text NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('entry','extra')),
  item_id uuid NOT NULL,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (city, item_type, item_id, badge_id)
);

CREATE INDEX idx_fs_hp_card_badges_item ON public.front_structure_homepage_card_badges(city, item_type, item_id);

GRANT SELECT ON public.front_structure_homepage_card_badges TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.front_structure_homepage_card_badges TO authenticated;
GRANT ALL ON public.front_structure_homepage_card_badges TO service_role;

ALTER TABLE public.front_structure_homepage_card_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fs_hp_card_badges public read"
  ON public.front_structure_homepage_card_badges FOR SELECT USING (true);
CREATE POLICY "fs_hp_card_badges staff insert"
  ON public.front_structure_homepage_card_badges FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "fs_hp_card_badges staff update"
  ON public.front_structure_homepage_card_badges FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "fs_hp_card_badges staff delete"
  ON public.front_structure_homepage_card_badges FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));