
CREATE POLICY "Staff can update generic_video_pois"
  ON public.generic_video_pois FOR UPDATE
  USING (is_staff(auth.uid()));

CREATE POLICY "Staff can update generic_video_businesses"
  ON public.generic_video_businesses FOR UPDATE
  USING (is_staff(auth.uid()));
