ALTER TABLE public.embed_ai_suggestions ADD COLUMN IF NOT EXISTS commodity_filters text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.embed_ai_followups ADD COLUMN IF NOT EXISTS commodity_filters text[] NOT NULL DEFAULT '{}';
UPDATE public.embed_ai_suggestions SET commodity_filters = ARRAY['Livraison internationale'] WHERE id = '2aa7645f-7283-444d-b8e3-b41a0b3b8b83';