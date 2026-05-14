DROP POLICY IF EXISTS "Staff can upload business images" ON storage.objects;
DROP POLICY IF EXISTS "Staff can update business images" ON storage.objects;
DROP POLICY IF EXISTS "Staff can delete business images" ON storage.objects;

CREATE POLICY "Staff can upload business images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'business-images' AND public.is_staff(auth.uid()));

CREATE POLICY "Staff can update business images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'business-images' AND public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete business images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'business-images' AND public.is_staff(auth.uid()));