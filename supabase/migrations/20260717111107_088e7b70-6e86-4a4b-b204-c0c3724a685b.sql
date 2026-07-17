CREATE POLICY "Affiliates can update reviews of own businesses"
ON public.reviews
FOR UPDATE
TO authenticated
USING (public.is_own_affiliate_business(auth.uid(), business_id))
WITH CHECK (public.is_own_affiliate_business(auth.uid(), business_id));

CREATE POLICY "Affiliates can delete reviews of own businesses"
ON public.reviews
FOR DELETE
TO authenticated
USING (public.is_own_affiliate_business(auth.uid(), business_id));