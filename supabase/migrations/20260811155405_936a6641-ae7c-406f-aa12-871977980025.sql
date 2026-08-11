ALTER TABLE public.video_scenario_steps DROP CONSTRAINT IF EXISTS video_scenario_steps_mode_check;
ALTER TABLE public.video_scenario_steps
  ADD CONSTRAINT video_scenario_steps_mode_check CHECK (mode IN ('business','corporate','explainer'));