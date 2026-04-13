CREATE TABLE public.generic_video_pois (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  generic_video_id uuid NOT NULL REFERENCES public.generic_videos(id) ON DELETE CASCADE,
  poi_id uuid NOT NULL REFERENCES public.points_of_interest(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (generic_video_id, poi_id)
);

ALTER TABLE public.generic_video_pois ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Generic video POIs are viewable by everyone"
  ON public.generic_video_pois FOR SELECT
  USING (true);

CREATE POLICY "Staff can insert generic video POIs"
  ON public.generic_video_pois FOR INSERT
  TO authenticated
  WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can delete generic video POIs"
  ON public.generic_video_pois FOR DELETE
  TO authenticated
  USING (is_staff(auth.uid()));

CREATE POLICY "Staff can update generic video POIs"
  ON public.generic_video_pois FOR UPDATE
  TO authenticated
  USING (is_staff(auth.uid()));