ALTER TABLE public.video_scenario_configs
  ADD COLUMN IF NOT EXISTS effects jsonb,
  ADD COLUMN IF NOT EXISTS encode jsonb,
  ADD COLUMN IF NOT EXISTS render_prompt text,
  ADD COLUMN IF NOT EXISTS render_duration_sec integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS render_tone text NOT NULL DEFAULT 'immersif';