ALTER TABLE public.video_storyboards DROP CONSTRAINT IF EXISTS video_storyboards_scenario_type_check;
UPDATE public.video_storyboards SET scenario_type = 'establishment' WHERE scenario_type = 'promo_business';
UPDATE public.video_storyboards SET scenario_type = 'corporate' WHERE scenario_type = 'corporate_long';
ALTER TABLE public.video_storyboards ALTER COLUMN scenario_type SET DEFAULT 'corporate';
ALTER TABLE public.video_storyboards ADD CONSTRAINT video_storyboards_scenario_type_check CHECK (scenario_type IN ('establishment','corporate'));