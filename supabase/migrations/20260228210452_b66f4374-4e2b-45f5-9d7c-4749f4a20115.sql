CREATE TABLE public.ai_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  description text,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_config_select" ON public.ai_config FOR SELECT USING (true);
CREATE POLICY "ai_config_insert" ON public.ai_config FOR INSERT WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "ai_config_update" ON public.ai_config FOR UPDATE USING (is_staff(auth.uid()));
CREATE POLICY "ai_config_delete" ON public.ai_config FOR DELETE USING (is_staff(auth.uid()));

-- Seed default values
INSERT INTO public.ai_config (key, value, description) VALUES
  ('persona', 'Tu es un concierge expert du Maroc, chaleureux et passionné. Tu aides les utilisateurs à trouver les meilleurs établissements.', 'Persona / rôle du concierge IA'),
  ('tone', 'Sois naturel et enthousiaste, comme un ami local passionné qui partage ses meilleures adresses.', 'Ton et style de communication'),
  ('response_length', '5-8', 'Nombre de phrases (ex: 5-8)'),
  ('model', 'google/gemini-3-flash-preview', 'Modèle IA utilisé'),
  ('max_tokens', '600', 'Nombre max de tokens générés'),
  ('temperature', '0.7', 'Température (0-1, plus élevé = plus créatif)'),
  ('extra_instructions', '', 'Instructions supplémentaires ajoutées au prompt'),
  ('no_results_instructions', 'Utilise tes connaissances générales sur le Maroc pour donner des conseils utiles. Explique honnêtement que tu n''as pas d''établissement spécifique à recommander dans l''annuaire, mais partage des conseils pratiques et des suggestions générales.', 'Instructions quand aucun résultat trouvé');