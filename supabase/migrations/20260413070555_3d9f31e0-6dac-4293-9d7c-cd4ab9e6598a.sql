
CREATE TABLE public.generic_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  name TEXT,
  thumbnail_url TEXT,
  city TEXT,
  neighborhood TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.generic_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Generic videos are viewable by everyone"
ON public.generic_videos FOR SELECT
USING (true);

CREATE POLICY "Staff can insert generic videos"
ON public.generic_videos FOR INSERT
WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update generic videos"
ON public.generic_videos FOR UPDATE
USING (is_staff(auth.uid()));

CREATE POLICY "Staff can delete generic videos"
ON public.generic_videos FOR DELETE
USING (is_staff(auth.uid()));

CREATE TRIGGER update_generic_videos_updated_at
BEFORE UPDATE ON public.generic_videos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
