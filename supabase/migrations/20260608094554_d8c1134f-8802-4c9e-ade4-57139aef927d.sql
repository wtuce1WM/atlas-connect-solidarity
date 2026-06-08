
ALTER TABLE public.club_members ADD COLUMN IF NOT EXISTS avatar_url text;

CREATE POLICY "Club members can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'club-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Club members can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'club-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Club members can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'club-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Club members can read own avatar"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'club-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
