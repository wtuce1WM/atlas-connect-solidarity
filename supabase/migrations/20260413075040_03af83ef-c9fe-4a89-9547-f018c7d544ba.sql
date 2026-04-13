
CREATE TABLE public.generic_video_businesses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  generic_video_id uuid NOT NULL REFERENCES public.generic_videos(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (generic_video_id, business_id)
);

ALTER TABLE public.generic_video_businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view generic_video_businesses"
  ON public.generic_video_businesses FOR SELECT
  USING (true);

CREATE POLICY "Staff can insert generic_video_businesses"
  ON public.generic_video_businesses FOR INSERT
  WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can delete generic_video_businesses"
  ON public.generic_video_businesses FOR DELETE
  USING (is_staff(auth.uid()));
