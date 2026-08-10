-- 1) Tables unifiées
CREATE TABLE public.ai_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  surface text NOT NULL CHECK (surface IN ('club','embed','search')),
  label_fr text,
  label_en text,
  label_ar text,
  prompt_fr text,
  prompt_en text,
  prompt_ar text,
  fixed_response_fr text,
  fixed_response_en text,
  fixed_response_ar text,
  mode text,
  category text,
  main_categories text[] NOT NULL DEFAULT '{}',
  city text,
  subcategory_ids uuid[] NOT NULL DEFAULT '{}',
  badge_ids uuid[] NOT NULL DEFAULT '{}',
  business_ids uuid[] NOT NULL DEFAULT '{}',
  destination_ids uuid[] NOT NULL DEFAULT '{}',
  blog_post_ids uuid[] NOT NULL DEFAULT '{}',
  commodity_filters text[] NOT NULL DEFAULT '{}',
  proximity_a_subcategory_ids uuid[] NOT NULL DEFAULT '{}',
  proximity_a_badge_ids uuid[] NOT NULL DEFAULT '{}',
  proximity_b_subcategory_ids uuid[] NOT NULL DEFAULT '{}',
  proximity_b_badge_ids uuid[] NOT NULL DEFAULT '{}',
  radius_km numeric,
  followups jsonb,
  disabled_followup_ids uuid[] NOT NULL DEFAULT '{}',
  label_embedding vector,
  label_embedded_source text,
  label_embedded_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  surface text NOT NULL CHECK (surface IN ('club','embed','search')),
  label_fr text,
  label_en text,
  label_ar text,
  mode text,
  category text,
  main_categories text[] NOT NULL DEFAULT '{}',
  city text,
  subcategory_ids uuid[] NOT NULL DEFAULT '{}',
  badge_ids uuid[] NOT NULL DEFAULT '{}',
  business_ids uuid[] NOT NULL DEFAULT '{}',
  destination_ids uuid[] NOT NULL DEFAULT '{}',
  blog_post_ids uuid[] NOT NULL DEFAULT '{}',
  commodity_filters text[] NOT NULL DEFAULT '{}',
  radius_km numeric,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_suggestions TO authenticated;
GRANT ALL ON public.ai_suggestions TO service_role;
GRANT SELECT ON public.ai_suggestions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_followups TO authenticated;
GRANT ALL ON public.ai_followups TO service_role;
GRANT SELECT ON public.ai_followups TO anon;

ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active ai suggestions"
  ON public.ai_suggestions FOR SELECT
  USING (is_active = true OR public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert ai suggestions"
  ON public.ai_suggestions FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update ai suggestions"
  ON public.ai_suggestions FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete ai suggestions"
  ON public.ai_suggestions FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Public can read active ai followups"
  ON public.ai_followups FOR SELECT
  USING (is_active = true OR public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert ai followups"
  ON public.ai_followups FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update ai followups"
  ON public.ai_followups FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete ai followups"
  ON public.ai_followups FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE INDEX ai_suggestions_surface_idx ON public.ai_suggestions (surface, is_active, sort_order);
CREATE INDEX ai_followups_surface_idx ON public.ai_followups (surface, is_active, sort_order);

CREATE TRIGGER ai_suggestions_set_updated_at
  BEFORE UPDATE ON public.ai_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER ai_followups_set_updated_at
  BEFORE UPDATE ON public.ai_followups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Copie des données existantes
INSERT INTO public.ai_suggestions (
  id, surface, label_fr, label_en, label_ar, prompt_fr, prompt_en, prompt_ar,
  fixed_response_fr, fixed_response_en, fixed_response_ar, mode, category, city,
  subcategory_ids, badge_ids, destination_ids, blog_post_ids, disabled_followup_ids,
  label_embedding, label_embedded_source, label_embedded_at,
  sort_order, is_active, created_at, updated_at
)
SELECT
  id, 'club', label_fr, label_en, label_ar, prompt_fr, prompt_en, prompt_ar,
  fixed_response_fr, fixed_response_en, fixed_response_ar, mode, category, city,
  COALESCE(subcategory_ids, '{}'), COALESCE(badge_ids, '{}'), COALESCE(destination_ids, '{}'),
  COALESCE(blog_post_ids, CASE WHEN blog_post_id IS NULL THEN '{}'::uuid[] ELSE ARRAY[blog_post_id] END),
  COALESCE(disabled_followup_ids, '{}'),
  label_embedding, label_embedded_source, label_embedded_at,
  COALESCE(sort_order, 0), COALESCE(is_active, true), created_at, updated_at
FROM public.club_ai_suggestions;

INSERT INTO public.ai_suggestions (
  id, surface, label_fr, label_en, label_ar, mode, city,
  main_categories, subcategory_ids, badge_ids, business_ids, destination_ids, blog_post_ids,
  commodity_filters, proximity_a_subcategory_ids, proximity_a_badge_ids,
  proximity_b_subcategory_ids, proximity_b_badge_ids,
  followups, disabled_followup_ids, sort_order, is_active, created_at, updated_at
)
SELECT
  id, 'embed', label_fr, label_en, label_ar, mode, city,
  COALESCE(main_categories, '{}'), COALESCE(subcategory_ids, '{}'), COALESCE(badge_ids, '{}'),
  COALESCE(business_ids, '{}'), COALESCE(destination_ids, '{}'), COALESCE(blog_post_ids, '{}'),
  COALESCE(commodity_filters, '{}'),
  COALESCE(proximity_a_subcategory_ids, '{}'), COALESCE(proximity_a_badge_ids, '{}'),
  COALESCE(proximity_b_subcategory_ids, '{}'), COALESCE(proximity_b_badge_ids, '{}'),
  followups, COALESCE(disabled_followup_ids, '{}'),
  COALESCE(sort_order, 0), COALESCE(is_active, true), created_at, updated_at
FROM public.embed_ai_suggestions;

INSERT INTO public.ai_suggestions (
  id, surface, label_fr, label_en, label_ar, prompt_fr, prompt_en, prompt_ar,
  fixed_response_fr, fixed_response_en, fixed_response_ar, mode, category, city,
  subcategory_ids, badge_ids, business_ids, destination_ids, blog_post_ids,
  followups, disabled_followup_ids, sort_order, is_active, created_at, updated_at
)
SELECT
  id, 'search', label_fr, label_en, label_ar, prompt_fr, prompt_en, prompt_ar,
  fixed_response_fr, fixed_response_en, fixed_response_ar, mode, category, city,
  COALESCE(subcategory_ids, '{}'), COALESCE(badge_ids, '{}'), COALESCE(business_ids, '{}'),
  COALESCE(destination_ids, '{}'), COALESCE(blog_post_ids, '{}'),
  followups, COALESCE(disabled_followup_ids, '{}'),
  COALESCE(sort_order, 0), COALESCE(is_active, true), created_at, updated_at
FROM public.search_ai_suggestions;

INSERT INTO public.ai_followups (
  id, surface, label_fr, label_en, label_ar, mode, category, city,
  subcategory_ids, badge_ids, radius_km, sort_order, is_active, created_at, updated_at
)
SELECT id, 'club', label_fr, label_en, label_ar, mode, category, city,
  COALESCE(subcategory_ids, '{}'), COALESCE(badge_ids, '{}'), radius_km,
  COALESCE(sort_order, 0), COALESCE(is_active, true), created_at, updated_at
FROM public.club_ai_followups;

INSERT INTO public.ai_followups (
  id, surface, label_fr, label_en, label_ar, mode, category, city,
  subcategory_ids, badge_ids, commodity_filters, radius_km, sort_order, is_active, created_at, updated_at
)
SELECT id, 'embed', label_fr, label_en, label_ar, mode, category, city,
  COALESCE(subcategory_ids, '{}'), COALESCE(badge_ids, '{}'), COALESCE(commodity_filters, '{}'), radius_km,
  COALESCE(sort_order, 0), COALESCE(is_active, true), created_at, updated_at
FROM public.embed_ai_followups;

INSERT INTO public.ai_followups (
  id, surface, label_fr, label_en, label_ar, mode, category, city,
  subcategory_ids, badge_ids, radius_km, sort_order, is_active, created_at, updated_at
)
SELECT id, 'search', label_fr, label_en, label_ar, mode, category, city,
  COALESCE(subcategory_ids, '{}'), COALESCE(badge_ids, '{}'), radius_km,
  COALESCE(sort_order, 0), COALESCE(is_active, true), created_at, updated_at
FROM public.search_ai_followups;

-- 3) Suppression des anciennes tables
DROP TABLE public.club_ai_suggestions;
DROP TABLE public.embed_ai_suggestions;
DROP TABLE public.search_ai_suggestions;
DROP TABLE public.club_ai_followups;
DROP TABLE public.embed_ai_followups;
DROP TABLE public.search_ai_followups;