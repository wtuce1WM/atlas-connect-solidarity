
CREATE POLICY "Affiliates can view own promotions" ON public.affiliate_business_promotions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_business_promotions.affiliate_id AND a.user_id = auth.uid())
  );
CREATE POLICY "Affiliates can insert own promotions" ON public.affiliate_business_promotions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_business_promotions.affiliate_id AND a.user_id = auth.uid())
    AND public.is_own_affiliate_business(auth.uid(), affiliate_business_promotions.business_id)
  );
CREATE POLICY "Affiliates can update own promotions" ON public.affiliate_business_promotions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_business_promotions.affiliate_id AND a.user_id = auth.uid())
  );
CREATE POLICY "Affiliates can delete own promotions" ON public.affiliate_business_promotions
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_business_promotions.affiliate_id AND a.user_id = auth.uid())
  );
