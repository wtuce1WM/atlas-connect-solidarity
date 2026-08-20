-- club-avatars: les avatars sont volontairement publics (pages de profil public /pseudo,
-- previews sociales og-meta). On aligne la lecture sur la réalité du bucket public
-- au lieu d'une restriction propriétaire inopérante et trompeuse.
DROP POLICY IF EXISTS "Club members can read own avatar" ON storage.objects;
CREATE POLICY "Public can read club avatars"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'club-avatars');

-- certification-images: badges de certification non sensibles servis via URL publique.
DROP POLICY IF EXISTS "Authenticated can read certification images" ON storage.objects;
CREATE POLICY "Public can read certification images"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'certification-images');