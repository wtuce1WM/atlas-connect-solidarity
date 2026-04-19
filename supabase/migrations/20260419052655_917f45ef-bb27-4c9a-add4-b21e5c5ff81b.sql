-- Personas catalog
CREATE TABLE public.personas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_fr text NOT NULL,
  name_en text,
  name_ar text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Personas are viewable by everyone"
ON public.personas FOR SELECT USING (true);

CREATE POLICY "Staff can insert personas"
ON public.personas FOR INSERT WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update personas"
ON public.personas FOR UPDATE USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete personas"
ON public.personas FOR DELETE USING (public.is_staff(auth.uid()));

CREATE TRIGGER update_personas_updated_at
BEFORE UPDATE ON public.personas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Join table: club members <-> personas
CREATE TABLE public.club_member_personas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.club_members(id) ON DELETE CASCADE,
  persona_id uuid NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, persona_id)
);

CREATE INDEX idx_club_member_personas_member ON public.club_member_personas(member_id);
CREATE INDEX idx_club_member_personas_persona ON public.club_member_personas(persona_id);

ALTER TABLE public.club_member_personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all member personas"
ON public.club_member_personas FOR SELECT
USING (public.is_staff(auth.uid()));

CREATE POLICY "Members can view their own personas"
ON public.club_member_personas FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.club_members cm
  WHERE cm.id = club_member_personas.member_id AND cm.user_id = auth.uid()
));

CREATE POLICY "Members can insert their own personas"
ON public.club_member_personas FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.club_members cm
  WHERE cm.id = club_member_personas.member_id AND cm.user_id = auth.uid()
));

CREATE POLICY "Members can delete their own personas"
ON public.club_member_personas FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.club_members cm
  WHERE cm.id = club_member_personas.member_id AND cm.user_id = auth.uid()
));

CREATE POLICY "Staff can insert member personas"
ON public.club_member_personas FOR INSERT
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete member personas"
ON public.club_member_personas FOR DELETE
USING (public.is_staff(auth.uid()));

-- Seed the 9 personas
INSERT INTO public.personas (slug, name_fr, name_en, sort_order) VALUES
  ('creatif', 'Le créatif', 'The Creative', 1),
  ('assoiffe-culture', 'L''assoiffé de culture', 'Culture Seeker', 2),
  ('nature-lover', 'Nature Lover', 'Nature Lover', 3),
  ('chasseur-frisson', 'Le chasseur de frisson', 'Thrill Seeker', 4),
  ('gourmet', 'Le gourmet', 'The Gourmet', 5),
  ('oiseau-nuit', 'L''oiseau de nuit', 'Night Owl', 6),
  ('bulle-bien-etre', 'La bulle de bien-être', 'Wellness Bubble', 7),
  ('chasseur-tapis', 'Le chasseur de tapis', 'Carpet Hunter', 8),
  ('fashionista', 'Fashionista', 'Fashionista', 9);
