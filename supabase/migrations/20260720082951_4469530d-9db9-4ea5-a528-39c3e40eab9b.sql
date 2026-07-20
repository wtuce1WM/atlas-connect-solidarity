ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS has_custom_domain boolean NOT NULL DEFAULT false;
GRANT UPDATE (has_custom_domain) ON public.affiliates TO service_role;
GRANT SELECT (has_custom_domain) ON public.affiliates TO service_role;
COMMENT ON COLUMN public.affiliates.has_custom_domain IS 'Autorise l''édition du champ Domaine personnalisé côté affilié (setup manuel staff)';