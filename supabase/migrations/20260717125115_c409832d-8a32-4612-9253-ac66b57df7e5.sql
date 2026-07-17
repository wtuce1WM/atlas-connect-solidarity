
-- Helper: is user an affiliate?
CREATE OR REPLACE FUNCTION public.is_affiliate(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.affiliates WHERE user_id = _user_id)
$$;

-- business_documents: affiliate CRUD on own businesses
CREATE POLICY "Affiliates can insert own business_documents" ON public.business_documents
  FOR INSERT TO authenticated
  WITH CHECK (business_id IS NOT NULL AND public.is_own_affiliate_business(auth.uid(), business_id));

CREATE POLICY "Affiliates can update own business_documents" ON public.business_documents
  FOR UPDATE TO authenticated
  USING (business_id IS NOT NULL AND public.is_own_affiliate_business(auth.uid(), business_id))
  WITH CHECK (business_id IS NOT NULL AND public.is_own_affiliate_business(auth.uid(), business_id));

CREATE POLICY "Affiliates can delete own business_documents" ON public.business_documents
  FOR DELETE TO authenticated
  USING (business_id IS NOT NULL AND public.is_own_affiliate_business(auth.uid(), business_id));

-- Storage: business-images uploads by affiliates
CREATE POLICY "Affiliates can upload business images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'business-images' AND public.is_affiliate(auth.uid()));

CREATE POLICY "Affiliates can update own business images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'business-images' AND owner = auth.uid());

CREATE POLICY "Affiliates can delete own business images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'business-images' AND owner = auth.uid());

-- Storage: business-videos uploads by affiliates
CREATE POLICY "Affiliates can upload business videos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'business-videos' AND public.is_affiliate(auth.uid()));

CREATE POLICY "Affiliates can update own business videos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'business-videos' AND owner = auth.uid());

CREATE POLICY "Affiliates can delete own business videos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'business-videos' AND owner = auth.uid());
