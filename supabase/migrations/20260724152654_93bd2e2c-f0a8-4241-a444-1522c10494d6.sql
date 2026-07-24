
CREATE TABLE public.embed_ai_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label_fr TEXT NOT NULL,
  label_en TEXT,
  label_ar TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.embed_ai_suggestions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.embed_ai_suggestions TO authenticated;
GRANT ALL ON public.embed_ai_suggestions TO service_role;

ALTER TABLE public.embed_ai_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active embed suggestions"
  ON public.embed_ai_suggestions FOR SELECT
  USING (is_active = true);

CREATE POLICY "Staff can read all embed suggestions"
  ON public.embed_ai_suggestions FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert embed suggestions"
  ON public.embed_ai_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update embed suggestions"
  ON public.embed_ai_suggestions FOR UPDATE
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete embed suggestions"
  ON public.embed_ai_suggestions FOR DELETE
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE TRIGGER update_embed_ai_suggestions_updated_at
  BEFORE UPDATE ON public.embed_ai_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.embed_ai_suggestions (label_fr, label_en, label_ar, sort_order) VALUES
  ('Que faire à proximité ?', 'What to do nearby?', 'ماذا أفعل في الجوار؟', 1),
  ('Où prendre un thé à la menthe ?', 'Where can I have mint tea?', 'أين أشرب أتاي بالنعناع؟', 2),
  ('Que faire ce week-end ?', 'What''s on this weekend?', 'ماذا يحدث هذا الأسبوع؟', 3),
  ('Comment venir depuis l''aéroport ?', 'How do I get here from the airport?', 'كيف أصل من المطار؟', 4);
