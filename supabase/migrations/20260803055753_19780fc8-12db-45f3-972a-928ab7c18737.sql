CREATE POLICY "Anyone can upload a widget avatar"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'widget-avatars');

CREATE POLICY "Widget avatars are publicly readable"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'widget-avatars');