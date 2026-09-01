CREATE TABLE public.ai_immersive_hooks (
  query_key TEXT NOT NULL,
  business_id UUID NOT NULL,
  lang TEXT NOT NULL,
  text TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (query_key, business_id, lang)
);
GRANT ALL ON public.ai_immersive_hooks TO service_role;
ALTER TABLE public.ai_immersive_hooks ENABLE ROW LEVEL SECURITY;