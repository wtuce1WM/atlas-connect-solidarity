ALTER TABLE public.video_scenario_steps
  ADD COLUMN IF NOT EXISTS kicker text,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS body text,
  ADD COLUMN IF NOT EXISTS key_message text,
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.video_scenario_configs (
  mode text PRIMARY KEY,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  format_key text NOT NULL DEFAULT 'landscape_1080',
  width integer NOT NULL DEFAULT 1920,
  height integer NOT NULL DEFAULT 1080,
  fps integer NOT NULL DEFAULT 30,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.video_scenario_configs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_scenario_configs TO authenticated;
GRANT ALL ON public.video_scenario_configs TO service_role;

ALTER TABLE public.video_scenario_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "video_scenario_configs_read_all"
  ON public.video_scenario_configs FOR SELECT USING (true);

CREATE POLICY "video_scenario_configs_staff_write"
  ON public.video_scenario_configs FOR ALL TO authenticated
  USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));

CREATE TRIGGER video_scenario_configs_set_updated_at
  BEFORE UPDATE ON public.video_scenario_configs
  FOR EACH ROW EXECUTE FUNCTION public.billing_set_updated_at();

INSERT INTO public.video_scenario_configs (mode, format_key, width, height, fps)
VALUES ('explainer', 'landscape_1080', 1920, 1080, 30)
ON CONFLICT (mode) DO NOTHING;