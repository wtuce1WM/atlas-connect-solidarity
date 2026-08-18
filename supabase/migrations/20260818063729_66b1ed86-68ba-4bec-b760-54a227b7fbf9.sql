-- Augmente le plafond de durée totale d'un storyboard de 180 s à 240 s.
ALTER TABLE public.video_storyboards
DROP CONSTRAINT IF EXISTS video_storyboards_max_duration_check;

ALTER TABLE public.video_storyboards
ADD CONSTRAINT video_storyboards_max_duration_check
CHECK (max_duration_sec > 0 AND max_duration_sec <= 240);
