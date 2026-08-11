INSERT INTO public.site_settings (key, value)
VALUES ('embed_ai_engine', 'v2')
ON CONFLICT (key) DO UPDATE SET value = 'v2';