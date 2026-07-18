
-- Suggestions du chat IA du Club, éditables par le staff
CREATE TABLE public.club_ai_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label_fr text NOT NULL,
  label_en text,
  label_ar text,
  prompt_fr text,
  prompt_en text,
  prompt_ar text,
  category text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.club_ai_suggestions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.club_ai_suggestions TO authenticated;
GRANT ALL ON public.club_ai_suggestions TO service_role;

ALTER TABLE public.club_ai_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active suggestions"
  ON public.club_ai_suggestions FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can insert suggestions"
  ON public.club_ai_suggestions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can update suggestions"
  ON public.club_ai_suggestions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can delete suggestions"
  ON public.club_ai_suggestions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE TRIGGER update_club_ai_suggestions_updated_at
  BEFORE UPDATE ON public.club_ai_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial FR suggestions from the current hardcoded list
INSERT INTO public.club_ai_suggestions (label_fr, label_en, label_ar, sort_order) VALUES
  ('Montre-moi sur une carte les hôtels avec piscine à Marrakech', 'Show me hotels with a pool in Marrakech on a map', 'أرني على الخريطة فنادق مع مسبح في مراكش', 10),
  ('Mes adresses sauvegardées à Marrakech', 'My saved places in Marrakech', 'أماكني المحفوظة في مراكش', 20),
  ('Un dîner romantique ce soir près de moi', 'A romantic dinner tonight near me', 'عشاء رومانسي الليلة قريب مني', 30),
  ('Météo à Essaouira ce weekend', 'Weather in Essaouira this weekend', 'الطقس في الصويرة هذا الأسبوع', 40),
  ('Suggère-moi un spa similaire à mes favoris', 'Suggest a spa similar to my favorites', 'اقترح لي سبا مشابهاً لمفضلاتي', 50),
  ('Une activité originale en famille demain', 'An original family activity tomorrow', 'نشاط عائلي أصلي غداً', 60),
  ('Un rooftop avec vue pour l''apéro', 'A rooftop with a view for sunset drinks', 'روفتوب بإطلالة لأمسية', 70),
  ('Numéros d''urgence à Marrakech', 'Emergency numbers in Marrakech', 'أرقام الطوارئ في مراكش', 80),
  ('Un brunch healthy dimanche matin', 'A healthy Sunday brunch', 'برانش صحي يوم الأحد', 90),
  ('Une excursion d''une journée depuis Marrakech', 'A day trip from Marrakech', 'رحلة يوم من مراكش', 100),
  ('Un riad de charme dans la médina', 'A charming riad in the medina', 'رياض ساحر في المدينة القديمة', 110),
  ('Une pharmacie de garde ce soir', 'A pharmacy open tonight', 'صيدلية مناوبة الليلة', 120),
  ('Un restaurant marocain authentique pas cher', 'An affordable authentic Moroccan restaurant', 'مطعم مغربي أصيل بسعر مناسب', 130),
  ('Que faire à Essaouira sous la pluie', 'What to do in Essaouira in the rain', 'ماذا أفعل في الصويرة تحت المطر', 140),
  ('Une boutique d''artisanat éthique', 'An ethical craft boutique', 'متجر حرف يدوية أخلاقي', 150),
  ('Un cours de cuisine marocaine', 'A Moroccan cooking class', 'درس طبخ مغربي', 160),
  ('Un café calme pour télétravailler', 'A quiet café to work from', 'مقهى هادئ للعمل', 170),
  ('Une soirée avec musique live ce weekend', 'Live music night this weekend', 'سهرة موسيقى حية هذا الأسبوع', 180),
  ('Un hammam traditionnel bien noté', 'A well-rated traditional hammam', 'حمام تقليدي مقيّم جيداً', 190),
  ('Une plage tranquille près d''Essaouira', 'A quiet beach near Essaouira', 'شاطئ هادئ قرب الصويرة', 200),
  ('Un spot photo au lever du soleil', 'A sunrise photo spot', 'مكان تصوير عند شروق الشمس', 210);
