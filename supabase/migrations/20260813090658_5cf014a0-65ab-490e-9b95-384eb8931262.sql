CREATE OR REPLACE FUNCTION public.business_exists(_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.businesses WHERE id = _business_id)
$$;

DROP POLICY IF EXISTS "Businesses are viewable by everyone" ON public.businesses;
CREATE POLICY "Businesses are viewable by everyone"
ON public.businesses FOR SELECT
USING (
  is_active = true
  OR public.is_staff(auth.uid())
  OR public.is_own_affiliate_business(auth.uid(), id)
);

DROP POLICY IF EXISTS "YouTube videos are viewable by everyone" ON public.business_youtube_videos;
CREATE POLICY "YouTube videos are viewable by everyone"
ON public.business_youtube_videos FOR SELECT
USING (
  is_visible = true
  OR public.is_staff(auth.uid())
  OR public.is_own_affiliate_business(auth.uid(), business_id)
);

DROP POLICY IF EXISTS "widget_events public insert" ON public.widget_events;
CREATE POLICY "widget_events public insert"
ON public.widget_events FOR INSERT
WITH CHECK (
  business_id IS NULL OR public.business_exists(business_id)
);