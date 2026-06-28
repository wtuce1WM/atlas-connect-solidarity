DROP POLICY IF EXISTS "Anyone can view video bookmarks" ON public.video_bookmarks;
CREATE POLICY "Users can view their own video bookmarks"
ON public.video_bookmarks FOR SELECT
USING (auth.uid() = user_id OR public.is_staff(auth.uid()));