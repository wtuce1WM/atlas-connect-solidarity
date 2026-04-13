CREATE TABLE public.business_youtube_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  thumbnail TEXT NOT NULL DEFAULT '',
  published_at TIMESTAMP WITH TIME ZONE,
  is_short BOOLEAN NOT NULL DEFAULT false,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(business_id, video_id)
);

ALTER TABLE public.business_youtube_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "YouTube videos are viewable by everyone"
  ON public.business_youtube_videos FOR SELECT
  TO public USING (true);

CREATE POLICY "Staff can insert youtube videos"
  ON public.business_youtube_videos FOR INSERT
  TO public WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update youtube videos"
  ON public.business_youtube_videos FOR UPDATE
  TO public USING (is_staff(auth.uid()));

CREATE POLICY "Staff can delete youtube videos"
  ON public.business_youtube_videos FOR DELETE
  TO public USING (is_staff(auth.uid()));