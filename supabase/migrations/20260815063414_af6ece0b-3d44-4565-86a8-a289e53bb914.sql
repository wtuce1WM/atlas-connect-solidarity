-- Configurations de rendu persistées pour les chaînes « Promo business » et
-- « Scénario Feed » : permet le couple Enregistrer / Rendre (préparation puis
-- lancement en série, et relance à l'identique d'un rendu).
CREATE TABLE public.video_render_presets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kind text NOT NULL,
  name text NOT NULL,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT video_render_presets_kind_check CHECK (kind IN ('promo','feed'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_render_presets TO authenticated;
GRANT ALL ON public.video_render_presets TO service_role;

ALTER TABLE public.video_render_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY video_render_presets_staff_all
  ON public.video_render_presets FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER video_render_presets_set_updated_at
  BEFORE UPDATE ON public.video_render_presets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX video_render_presets_kind_updated
  ON public.video_render_presets (kind, updated_at DESC);