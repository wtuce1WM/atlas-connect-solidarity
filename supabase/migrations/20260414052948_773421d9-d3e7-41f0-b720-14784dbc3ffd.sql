
CREATE TABLE public.generic_video_cities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  generic_video_id UUID NOT NULL REFERENCES public.generic_videos(id) ON DELETE CASCADE,
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(generic_video_id, city_id)
);

ALTER TABLE public.generic_video_cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "generic_video_cities_select" ON public.generic_video_cities FOR SELECT TO public USING (true);
CREATE POLICY "generic_video_cities_insert" ON public.generic_video_cities FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "generic_video_cities_delete" ON public.generic_video_cities FOR DELETE TO authenticated USING (is_staff(auth.uid()));
