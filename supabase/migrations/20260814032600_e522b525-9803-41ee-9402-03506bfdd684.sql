-- 1. Storyboards (source de vérité d'un montage manuel)
CREATE TABLE public.video_storyboards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  scenario_type text NOT NULL DEFAULT 'corporate_long',
  format text NOT NULL DEFAULT 'landscape',
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  preview_scale numeric NOT NULL DEFAULT 0.5,
  max_duration_sec integer NOT NULL DEFAULT 180,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT video_storyboards_format_check CHECK (format IN ('portrait','landscape')),
  CONSTRAINT video_storyboards_scenario_type_check CHECK (scenario_type IN ('promo_business','corporate_long')),
  CONSTRAINT video_storyboards_preview_scale_check CHECK (preview_scale > 0 AND preview_scale <= 1),
  CONSTRAINT video_storyboards_max_duration_check CHECK (max_duration_sec > 0 AND max_duration_sec <= 180)
);

GRANT SELECT ON public.video_storyboards TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_storyboards TO authenticated;
GRANT ALL ON public.video_storyboards TO service_role;

ALTER TABLE public.video_storyboards ENABLE ROW LEVEL SECURITY;

CREATE POLICY video_storyboards_read_all
  ON public.video_storyboards FOR SELECT USING (true);

CREATE POLICY video_storyboards_staff_write
  ON public.video_storyboards FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER video_storyboards_set_updated_at
  BEFORE UPDATE ON public.video_storyboards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Extension additive des étapes
ALTER TABLE public.video_scenario_steps
  ADD COLUMN storyboard_id uuid REFERENCES public.video_storyboards(id) ON DELETE CASCADE,
  ADD COLUMN step_type text,
  ADD COLUMN config jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.video_scenario_steps
  ADD CONSTRAINT video_scenario_steps_step_type_check
  CHECK (step_type IS NULL OR step_type IN (
    'hook','video','photos','text_overlay','counter','map_reveal','split_screen','logo_merge','outro'
  ));

-- Un storyboard peut contenir plusieurs sections du même type :
-- l'unicité historique ne s'applique qu'aux scénarios existants.
ALTER TABLE public.video_scenario_steps
  DROP CONSTRAINT video_scenario_steps_mode_scene_key_key;

CREATE UNIQUE INDEX video_scenario_steps_legacy_mode_scene_key
  ON public.video_scenario_steps (mode, scene_key)
  WHERE storyboard_id IS NULL;

CREATE INDEX video_scenario_steps_storyboard_position
  ON public.video_scenario_steps (storyboard_id, position)
  WHERE storyboard_id IS NOT NULL;

-- Les étapes rattachées à un storyboard doivent porter un type de section.
ALTER TABLE public.video_scenario_steps
  ADD CONSTRAINT video_scenario_steps_storyboard_step_type
  CHECK (storyboard_id IS NULL OR step_type IS NOT NULL);