
DROP POLICY IF EXISTS "Anyone can view video likes" ON public.video_likes;
CREATE POLICY "Owners and staff can view their video likes" ON public.video_likes
  FOR SELECT USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Anyone can view video views" ON public.video_views;
CREATE POLICY "Owners and staff can view their video views" ON public.video_views
  FOR SELECT USING ((user_id IS NOT NULL AND auth.uid() = user_id) OR public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.get_video_like_count(p_video_id text, p_video_source text)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::int FROM public.video_likes WHERE video_id = p_video_id AND video_source = p_video_source;
$$;

CREATE OR REPLACE FUNCTION public.get_video_view_count(p_video_id text, p_video_source text)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::int FROM public.video_views WHERE video_id = p_video_id AND video_source = p_video_source;
$$;

GRANT EXECUTE ON FUNCTION public.get_video_like_count(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_video_view_count(text, text) TO anon, authenticated;
