CREATE TABLE public.video_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  video_source TEXT NOT NULL CHECK (video_source IN ('youtube','business','generic')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, video_id, video_source)
);

CREATE INDEX video_likes_video_idx ON public.video_likes (video_source, video_id);
CREATE INDEX video_likes_user_idx ON public.video_likes (user_id);

GRANT SELECT ON public.video_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.video_likes TO authenticated;
GRANT ALL ON public.video_likes TO service_role;

ALTER TABLE public.video_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view video likes"
ON public.video_likes FOR SELECT
USING (true);

CREATE POLICY "Users can like videos"
ON public.video_likes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes"
ON public.video_likes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);