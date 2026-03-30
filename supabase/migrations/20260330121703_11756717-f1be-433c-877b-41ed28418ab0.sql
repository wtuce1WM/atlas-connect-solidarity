CREATE POLICY "Public can read hotel_mappings"
  ON public.hotel_mappings
  FOR SELECT
  TO public
  USING (true);