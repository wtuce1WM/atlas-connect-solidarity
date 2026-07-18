ALTER TABLE public.affiliates
  ADD COLUMN IF NOT EXISTS max_businesses smallint CHECK (max_businesses >= 0 AND max_businesses <= 99),
  ADD COLUMN IF NOT EXISTS has_video_studio boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_dashboard boolean DEFAULT false;

GRANT UPDATE (max_businesses, has_video_studio, has_dashboard) ON public.affiliates TO service_role;
GRANT SELECT (max_businesses, has_video_studio, has_dashboard) ON public.affiliates TO service_role;

COMMENT ON COLUMN public.affiliates.max_businesses IS 'Nombre maximum d''établissements autorisés (0-99)';
COMMENT ON COLUMN public.affiliates.has_video_studio IS 'Accès au Studio Vidéo';
COMMENT ON COLUMN public.affiliates.has_dashboard IS 'Accès au Dashboard Affilié';