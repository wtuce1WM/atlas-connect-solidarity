CREATE TABLE public.generic_video_destinations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  generic_video_id UUID NOT NULL REFERENCES public.generic_videos(id) ON DELETE CASCADE,
  destination_id UUID NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  start_time NUMERIC NULL,
  end_time NUMERIC NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(generic_video_id, destination_id)
);

ALTER TABLE public.generic_video_destinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "generic_video_destinations_select" ON public.generic_video_destinations FOR SELECT USING (true);
CREATE POLICY "generic_video_destinations_insert" ON public.generic_video_destinations FOR INSERT WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "generic_video_destinations_update" ON public.generic_video_destinations FOR UPDATE USING (is_staff(auth.uid()));
CREATE POLICY "generic_video_destinations_delete" ON public.generic_video_destinations FOR DELETE USING (is_staff(auth.uid()));