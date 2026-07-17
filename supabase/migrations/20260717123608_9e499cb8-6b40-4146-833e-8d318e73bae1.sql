
CREATE POLICY "Affiliates can view own front_highlights" ON public.front_highlights
  FOR SELECT TO authenticated
  USING (business_id IS NOT NULL AND public.is_own_affiliate_business(auth.uid(), business_id));

CREATE POLICY "Affiliates can insert own front_highlights" ON public.front_highlights
  FOR INSERT TO authenticated
  WITH CHECK (business_id IS NOT NULL AND public.is_own_affiliate_business(auth.uid(), business_id));

CREATE POLICY "Affiliates can update own front_highlights" ON public.front_highlights
  FOR UPDATE TO authenticated
  USING (business_id IS NOT NULL AND public.is_own_affiliate_business(auth.uid(), business_id))
  WITH CHECK (business_id IS NOT NULL AND public.is_own_affiliate_business(auth.uid(), business_id));
