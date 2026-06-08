CREATE POLICY "Public can read club avatars"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'club-avatars');