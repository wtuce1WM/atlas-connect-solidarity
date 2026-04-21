-- Add destination assignment to YouTube videos
ALTER TABLE public.business_youtube_videos 
ADD COLUMN IF NOT EXISTS destination_id uuid REFERENCES public.destinations(id) ON DELETE SET NULL;

-- Junction table for YouTube video <-> POIs (many-to-many)
CREATE TABLE IF NOT EXISTS public.business_youtube_video_pois (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_video_id uuid NOT NULL REFERENCES public.business_youtube_videos(id) ON DELETE CASCADE,
  point_of_interest_id uuid NOT NULL REFERENCES public.points_of_interest(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (youtube_video_id, point_of_interest_id)
);

ALTER TABLE public.business_youtube_video_pois ENABLE ROW LEVEL SECURITY;

CREATE POLICY "YouTube video POIs are viewable by everyone"
  ON public.business_youtube_video_pois FOR SELECT USING (true);

CREATE POLICY "Staff can insert youtube video POIs"
  ON public.business_youtube_video_pois FOR INSERT WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can delete youtube video POIs"
  ON public.business_youtube_video_pois FOR DELETE USING (is_staff(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_byv_pois_video ON public.business_youtube_video_pois(youtube_video_id);
CREATE INDEX IF NOT EXISTS idx_byv_pois_poi ON public.business_youtube_video_pois(point_of_interest_id);
CREATE INDEX IF NOT EXISTS idx_byv_destination ON public.business_youtube_videos(destination_id);