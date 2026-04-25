DROP POLICY IF EXISTS "Staff can view generic_video_subcategories" ON public.generic_video_subcategories;

CREATE POLICY "Generic video subcategories are viewable by everyone"
ON public.generic_video_subcategories
FOR SELECT
USING (true);