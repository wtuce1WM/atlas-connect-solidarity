CREATE TABLE IF NOT EXISTS public.generic_video_subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  generic_video_id UUID NOT NULL REFERENCES public.generic_videos(id) ON DELETE CASCADE,
  subcategory_id UUID NOT NULL REFERENCES public.subcategories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (generic_video_id, subcategory_id)
);

CREATE INDEX IF NOT EXISTS idx_gvs_video ON public.generic_video_subcategories(generic_video_id);
CREATE INDEX IF NOT EXISTS idx_gvs_subcat ON public.generic_video_subcategories(subcategory_id);

ALTER TABLE public.generic_video_subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view generic_video_subcategories"
  ON public.generic_video_subcategories FOR SELECT
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert generic_video_subcategories"
  ON public.generic_video_subcategories FOR INSERT
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete generic_video_subcategories"
  ON public.generic_video_subcategories FOR DELETE
  USING (public.is_staff(auth.uid()));