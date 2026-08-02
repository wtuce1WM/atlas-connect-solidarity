CREATE POLICY "Affiliates manage own legal files"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'affiliate-legal'
  AND EXISTS (
    SELECT 1 FROM public.affiliates a
    WHERE a.user_id = auth.uid() AND a.id::text = (storage.foldername(name))[1]
  )
)
WITH CHECK (
  bucket_id = 'affiliate-legal'
  AND EXISTS (
    SELECT 1 FROM public.affiliates a
    WHERE a.user_id = auth.uid() AND a.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Staff manage all legal files"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'affiliate-legal' AND public.is_staff(auth.uid()))
WITH CHECK (bucket_id = 'affiliate-legal' AND public.is_staff(auth.uid()));