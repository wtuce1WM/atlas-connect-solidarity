
CREATE TABLE public.embed_ai_followups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label_fr TEXT NOT NULL,
  label_en TEXT,
  label_ar TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.embed_ai_followups TO anon, authenticated;
GRANT ALL ON public.embed_ai_followups TO service_role;

ALTER TABLE public.embed_ai_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active followups"
  ON public.embed_ai_followups FOR SELECT
  USING (is_active = true OR public.is_staff(auth.uid()));

CREATE POLICY "Staff manage followups"
  ON public.embed_ai_followups FOR ALL
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER trg_embed_ai_followups_updated
  BEFORE UPDATE ON public.embed_ai_followups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.embed_ai_followups (label_fr, label_en, label_ar, sort_order) VALUES
  ('Quelles sont les distances depuis {businessName} ?', 'What are the distances from {businessName}?', 'ما هي المسافات من {businessName}؟', 10),
  ('Consulter les horaires', 'Check opening hours', 'الاطلاع على ساعات العمل', 20),
  ('Montre-moi les coordonnées pour appeler', 'Show me the contact details to call', 'أرني معلومات الاتصال', 30),
  ('Autres points d''intérêt à proximité de {businessName}', 'Other points of interest nearby {businessName}', 'نقاط اهتمام أخرى قريبة من {businessName}', 40),
  ('On peut réserver en ligne ?', 'Can we book online?', 'هل يمكن الحجز عبر الإنترنت؟', 50),
  ('Quelle est la météo prévue ?', 'What''s the weather forecast?', 'ما هي توقعات الطقس؟', 60),
  ('Autres activités à proximité', 'Other activities nearby', 'أنشطة أخرى قريبة', 70);
