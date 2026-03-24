
INSERT INTO storage.buckets (id, name, public)
VALUES ('external-link-images', 'external-link-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view external link images"
ON storage.objects FOR SELECT
USING (bucket_id = 'external-link-images');

CREATE POLICY "Staff can upload external link images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'external-link-images' AND (SELECT is_staff(auth.uid())));

CREATE POLICY "Staff can delete external link images"
ON storage.objects FOR DELETE
USING (bucket_id = 'external-link-images' AND (SELECT is_staff(auth.uid())));
