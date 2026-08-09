-- ============ 1. search_ai_suggestions ============
CREATE TABLE public.search_ai_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label_fr text NOT NULL,
  label_en text,
  label_ar text,
  prompt_fr text,
  prompt_en text,
  prompt_ar text,
  fixed_response_fr text,
  fixed_response_en text,
  fixed_response_ar text,
  category text,
  city text,
  subcategory_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  badge_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  business_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  destination_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  blog_post_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  followups jsonb NOT NULL DEFAULT '[]'::jsonb,
  disabled_followup_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  mode text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.search_ai_suggestions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.search_ai_suggestions TO authenticated;
GRANT ALL ON public.search_ai_suggestions TO service_role;

ALTER TABLE public.search_ai_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active search suggestions"
  ON public.search_ai_suggestions FOR SELECT
  USING (is_active = true OR public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert search suggestions"
  ON public.search_ai_suggestions FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update search suggestions"
  ON public.search_ai_suggestions FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete search suggestions"
  ON public.search_ai_suggestions FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE TRIGGER update_search_ai_suggestions_updated_at
  BEFORE UPDATE ON public.search_ai_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 2. search_ai_followups ============
CREATE TABLE public.search_ai_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label_fr text NOT NULL,
  label_en text,
  label_ar text,
  category text,
  city text,
  subcategory_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  badge_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  mode text,
  radius_km numeric,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.search_ai_followups TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.search_ai_followups TO authenticated;
GRANT ALL ON public.search_ai_followups TO service_role;

ALTER TABLE public.search_ai_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active search followups"
  ON public.search_ai_followups FOR SELECT
  USING (is_active = true OR public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert search followups"
  ON public.search_ai_followups FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update search followups"
  ON public.search_ai_followups FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete search followups"
  ON public.search_ai_followups FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE TRIGGER update_search_ai_followups_updated_at
  BEFORE UPDATE ON public.search_ai_followups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 3. Taxonomie sur les relances existantes ============
ALTER TABLE public.club_ai_followups
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS subcategory_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS badge_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

ALTER TABLE public.embed_ai_followups
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS subcategory_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS badge_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

-- ============ 4. Index GIN pour les tableaux ============
CREATE INDEX IF NOT EXISTS idx_search_ai_suggestions_subcategory_ids ON public.search_ai_suggestions USING GIN (subcategory_ids);
CREATE INDEX IF NOT EXISTS idx_search_ai_suggestions_badge_ids ON public.search_ai_suggestions USING GIN (badge_ids);
CREATE INDEX IF NOT EXISTS idx_search_ai_followups_subcategory_ids ON public.search_ai_followups USING GIN (subcategory_ids);
CREATE INDEX IF NOT EXISTS idx_search_ai_followups_badge_ids ON public.search_ai_followups USING GIN (badge_ids);
CREATE INDEX IF NOT EXISTS idx_club_ai_followups_subcategory_ids ON public.club_ai_followups USING GIN (subcategory_ids);
CREATE INDEX IF NOT EXISTS idx_club_ai_followups_badge_ids ON public.club_ai_followups USING GIN (badge_ids);
CREATE INDEX IF NOT EXISTS idx_embed_ai_followups_subcategory_ids ON public.embed_ai_followups USING GIN (subcategory_ids);
CREATE INDEX IF NOT EXISTS idx_embed_ai_followups_badge_ids ON public.embed_ai_followups USING GIN (badge_ids);

-- ============ 5. Seed suggestions initiales pour Search IA ============
INSERT INTO public.search_ai_suggestions (label_fr, label_en, label_ar, sort_order, is_active) VALUES
  ('Un restaurant marocain authentique à Marrakech', 'An authentic Moroccan restaurant in Marrakech', 'مطعم مغربي أصيل في مراكش', 10, true),
  ('Un rooftop avec vue pour l''apéro', 'A rooftop with a view for sunset drinks', 'روفتوب بإطلالة لأمسية', 20, true),
  ('Que faire à Essaouira ce week-end ?', 'What to do in Essaouira this weekend?', 'ماذا تفعل في الصويرة هذا الأسبوع؟', 30, true),
  ('Un hôtel avec piscine près de la médina', 'A hotel with a pool near the medina', 'فندق مع مسبح قرب المدينة القديمة', 40, true)
ON CONFLICT (id) DO NOTHING;
