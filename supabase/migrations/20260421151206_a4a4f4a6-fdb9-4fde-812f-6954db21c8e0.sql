
CREATE TABLE public.business_youtube_video_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  youtube_video_id UUID NOT NULL REFERENCES public.business_youtube_videos(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (youtube_video_id, badge_id)
);
CREATE INDEX idx_byt_video_badges_video ON public.business_youtube_video_badges(youtube_video_id);
CREATE INDEX idx_byt_video_badges_badge ON public.business_youtube_video_badges(badge_id);

ALTER TABLE public.business_youtube_video_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "YT video badges viewable by everyone"
  ON public.business_youtube_video_badges FOR SELECT USING (true);
CREATE POLICY "Staff can insert YT video badges"
  ON public.business_youtube_video_badges FOR INSERT WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can update YT video badges"
  ON public.business_youtube_video_badges FOR UPDATE USING (is_staff(auth.uid()));
CREATE POLICY "Staff can delete YT video badges"
  ON public.business_youtube_video_badges FOR DELETE USING (is_staff(auth.uid()));
