CREATE TABLE public.video_scenario_steps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mode text NOT NULL CHECK (mode IN ('business','corporate')),
  scene_key text NOT NULL,
  label text,
  position integer NOT NULL DEFAULT 0,
  duration_sec integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mode, scene_key)
);

GRANT SELECT ON public.video_scenario_steps TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_scenario_steps TO authenticated;
GRANT ALL ON public.video_scenario_steps TO service_role;

ALTER TABLE public.video_scenario_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "video_scenario_steps_read_all" ON public.video_scenario_steps FOR SELECT USING (true);
CREATE POLICY "video_scenario_steps_staff_write" ON public.video_scenario_steps FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER video_scenario_steps_updated_at BEFORE UPDATE ON public.video_scenario_steps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.video_scenario_steps (mode, scene_key, label, position, duration_sec) VALUES
('business','logo','Logo',10,2),
('business','welcome','Bienvenue',20,3),
('business','popup','Popup',30,0),
('business','proposition','Proposition',40,3),
('business','weather','Widget Météo',50,6),
('business','tides','Widget Marées, Vents & Météo',60,6),
('business','hook','Hook',70,6),
('business','name','Nom & Identité',80,0),
('business','ai_card','Carte IA',90,4),
('business','offer','Offre',100,0),
('business','highlight','Blocs highlights',110,0),
('business','ai_summary','Résumé IA',120,0),
('business','external_link','Lien externe',130,0),
('business','menu_doc','Menu / Document',140,0),
('business','media','Médias',150,0),
('business','reviews','Avis',160,0),
('business','google_review','Avis Google',170,0),
('business','hours','Horaires',180,3),
('business','map','Localisation',190,3),
('business','digital','ID Numérique',200,3),
('business','blog','Blog',210,0),
('business','whatsapp','WhatsApp',220,0),
('business','cta','CTA final',230,0),
('corporate','logo','Logo',10,2),
('corporate','hook','Hook',20,6),
('corporate','media','Médias',30,0),
('corporate','offer','Offre',40,0),
('corporate','cta','CTA final',50,0);