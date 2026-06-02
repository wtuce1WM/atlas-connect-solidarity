
CREATE TABLE public.youtube_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_fr text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.youtube_themes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.youtube_themes TO authenticated;
GRANT ALL ON public.youtube_themes TO service_role;

ALTER TABLE public.youtube_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "youtube_themes readable by all"
  ON public.youtube_themes FOR SELECT
  USING (true);

CREATE POLICY "youtube_themes staff write"
  ON public.youtube_themes FOR ALL
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.business_youtube_themes (
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  theme_id uuid NOT NULL REFERENCES public.youtube_themes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (business_id, theme_id)
);

GRANT SELECT ON public.business_youtube_themes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_youtube_themes TO authenticated;
GRANT ALL ON public.business_youtube_themes TO service_role;

ALTER TABLE public.business_youtube_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_youtube_themes readable by all"
  ON public.business_youtube_themes FOR SELECT
  USING (true);

CREATE POLICY "business_youtube_themes staff write"
  ON public.business_youtube_themes FOR ALL
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE INDEX idx_business_youtube_themes_theme ON public.business_youtube_themes(theme_id);

INSERT INTO public.youtube_themes (slug, name_fr, sort_order) VALUES
  ('cuisine', 'Cuisine', 10),
  ('sante', 'Santé', 20),
  ('expatriation', 'Expatriation', 30),
  ('parler-darija', 'Parler Darija', 40),
  ('immobilier', 'Immobilier', 50),
  ('business', 'Business', 60),
  ('culture', 'Culture', 70),
  ('vie-nocturne', 'Vie nocturne', 80),
  ('etablissements', 'Etablissements', 90),
  ('sport', 'Sport', 100),
  ('tourisme', 'Tourisme', 110);
