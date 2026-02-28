
CREATE TABLE public.easter_eggs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'overlay',
  keywords text[] NOT NULL DEFAULT '{}'::text[],
  is_active boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.easter_eggs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Easter eggs are viewable by everyone" ON public.easter_eggs FOR SELECT USING (true);
CREATE POLICY "Staff can insert easter eggs" ON public.easter_eggs FOR INSERT WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can update easter eggs" ON public.easter_eggs FOR UPDATE USING (is_staff(auth.uid()));
CREATE POLICY "Staff can delete easter eggs" ON public.easter_eggs FOR DELETE USING (is_staff(auth.uid()));

-- Seed with existing easter eggs
INSERT INTO public.easter_eggs (name, type, keywords, is_active, config, sort_order) VALUES
('Zitoun Musk', 'overlay', ARRAY['zitoun mask', 'zitoun musk', 'zitoun mas', 'zitoun mus'], true, '{"title": "Zitoun Musk", "subtitle": "Le légendaire gnawa en string léopard", "image": "/assets/zitoun-mask.jpg"}'::jsonb, 1),
('Célébrités', 'celebrity_guide', ARRAY['célébrité', 'celebrite', 'célébrités', 'star ', 'stars ', 'people marrakech', 'vip marrakech', 'famous', 'personnalité'], true, '{}'::jsonb, 2),
('SOS Médecin', 'emergency', ARRAY['sos médecin', 'sos medecin', 'sos docteur', 'besoin d''un docteur', 'besoin d un docteur', 'besoin d''un médecin', 'besoin d un medecin', 'médecin urgence', 'medecin urgence', 'docteur urgence', 'urgence médicale', 'urgence medicale', 'appeler un médecin', 'appeler un medecin', 'appeler un docteur', 'je suis malade', 'mal en point'], true, '{"color": "red", "phone": "0524 40 40 40", "label": "SOS Médecin Marrakech"}'::jsonb, 3),
('Pompiers', 'emergency', ARRAY['pompier', 'incendie', 'il y a le feu', 'ça brûle', 'ca brule', 'tout brûle', 'maison en feu', 'voiture en feu', 'feu de forêt', 'feu de foret', 'appeler les pompiers', 'sapeurs', 'brigade', 'protection civile feu'], true, '{"color": "orange", "phone": "15", "label": "Pompiers / Protection Civile"}'::jsonb, 4);
