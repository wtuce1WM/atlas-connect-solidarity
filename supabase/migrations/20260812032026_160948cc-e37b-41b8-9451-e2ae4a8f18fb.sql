ALTER TABLE public.video_scenario_steps ADD COLUMN IF NOT EXISTS widget_keys text[] NOT NULL DEFAULT '{}';

INSERT INTO public.video_scenario_steps (mode, scene_key, label, position, duration_sec, enabled, kicker, title)
SELECT 'explainer', 'exp_fiche', 'Fiche 1WM', 5, 8, true, 'Fiche 1WM', 'Votre fiche complète sur One World Morocco'
WHERE NOT EXISTS (SELECT 1 FROM public.video_scenario_steps WHERE mode='explainer' AND scene_key='exp_fiche');

INSERT INTO public.video_scenario_steps (mode, scene_key, label, position, duration_sec, enabled, kicker, title)
SELECT 'explainer', 'exp_geo', 'Géolocalisation & Cartes', 15, 8, true, 'Géolocalisation & Cartes', 'Vos clients vous trouvent, où qu''ils soient'
WHERE NOT EXISTS (SELECT 1 FROM public.video_scenario_steps WHERE mode='explainer' AND scene_key='exp_geo');