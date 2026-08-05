INSERT INTO public.video_scenario_steps (mode, scene_key, label, position, duration_sec, enabled)
VALUES ('business', 'ai_text', 'Texte IA', 85, 5, true)
ON CONFLICT DO NOTHING;