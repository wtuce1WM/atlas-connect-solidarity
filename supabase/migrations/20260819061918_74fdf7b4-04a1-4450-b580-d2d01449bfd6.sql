ALTER TABLE public.video_storyboards DROP CONSTRAINT IF EXISTS video_storyboards_scenario_type_check;
ALTER TABLE public.video_storyboards ALTER COLUMN scenario_type SET DEFAULT 'new';
ALTER TABLE public.video_storyboards ADD CONSTRAINT video_storyboards_scenario_type_check CHECK (scenario_type = ANY (ARRAY['new'::text,'establishment'::text,'corporate'::text]));