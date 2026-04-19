CREATE TABLE public.generic_video_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  generic_video_id UUID NOT NULL REFERENCES public.generic_videos(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (generic_video_id, badge_id)
);

CREATE INDEX idx_generic_video_badges_video ON public.generic_video_badges(generic_video_id);
CREATE INDEX idx_generic_video_badges_badge ON public.generic_video_badges(badge_id);

ALTER TABLE public.generic_video_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Generic video badges are viewable by everyone"
ON public.generic_video_badges FOR SELECT USING (true);

CREATE POLICY "Staff can insert generic video badges"
ON public.generic_video_badges FOR INSERT
WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update generic video badges"
ON public.generic_video_badges FOR UPDATE
USING (is_staff(auth.uid()));

CREATE POLICY "Staff can delete generic video badges"
ON public.generic_video_badges FOR DELETE
USING (is_staff(auth.uid()));