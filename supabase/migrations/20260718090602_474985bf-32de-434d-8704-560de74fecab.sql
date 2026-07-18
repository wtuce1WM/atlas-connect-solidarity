
CREATE OR REPLACE FUNCTION public.affiliate_owns_business_in_path(_user_id uuid, _name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.affiliates a
    JOIN public.businesses b ON b.affiliate_id = a.id
    WHERE a.user_id = _user_id
      AND split_part(regexp_replace(_name, '^.*/', ''), '-', 1) = replace(b.id::text, '-', '')
      OR (a.user_id = _user_id AND position(b.id::text in _name) > 0)
  )
$$;

DROP POLICY IF EXISTS "Affiliates can upload business images" ON storage.objects;
CREATE POLICY "Affiliates can upload business images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'business-images'
  AND public.is_affiliate(auth.uid())
  AND public.affiliate_owns_business_in_path(auth.uid(), name)
);

DROP POLICY IF EXISTS "Affiliates can upload business videos" ON storage.objects;
CREATE POLICY "Affiliates can upload business videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'business-videos'
  AND public.is_affiliate(auth.uid())
  AND public.affiliate_owns_business_in_path(auth.uid(), name)
);

DROP POLICY IF EXISTS "Affiliates can update own business images" ON storage.objects;
CREATE POLICY "Affiliates can update own business images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'business-images'
  AND (owner = auth.uid() OR public.affiliate_owns_business_in_path(auth.uid(), name))
)
WITH CHECK (
  bucket_id = 'business-images'
  AND public.affiliate_owns_business_in_path(auth.uid(), name)
);

DROP POLICY IF EXISTS "Affiliates can update own business videos" ON storage.objects;
CREATE POLICY "Affiliates can update own business videos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'business-videos'
  AND (owner = auth.uid() OR public.affiliate_owns_business_in_path(auth.uid(), name))
)
WITH CHECK (
  bucket_id = 'business-videos'
  AND public.affiliate_owns_business_in_path(auth.uid(), name)
);

DROP POLICY IF EXISTS "Affiliates can delete own business images" ON storage.objects;
CREATE POLICY "Affiliates can delete own business images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'business-images'
  AND (owner = auth.uid() OR public.affiliate_owns_business_in_path(auth.uid(), name))
);

DROP POLICY IF EXISTS "Affiliates can delete own business videos" ON storage.objects;
CREATE POLICY "Affiliates can delete own business videos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'business-videos'
  AND (owner = auth.uid() OR public.affiliate_owns_business_in_path(auth.uid(), name))
);
