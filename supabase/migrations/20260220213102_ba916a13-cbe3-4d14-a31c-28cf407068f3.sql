
-- Add public read policy for TTS-specific keys in staff_notes
CREATE POLICY "Public can read TTS phrases"
ON public.staff_notes
FOR SELECT
USING (key LIKE 'tts_%');

-- Seed the initial TTS intro phrase
INSERT INTO public.staff_notes (key, content)
VALUES ('tts_intro_phrase', 'Bienvenue sur WTUCE, votre guide de confiance au Maroc.')
ON CONFLICT (key) DO NOTHING;
