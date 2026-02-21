
-- Drop all existing SELECT policies on affiliate_business_promotions
DROP POLICY IF EXISTS "Public can view promotions" ON public.affiliate_business_promotions;
DROP POLICY IF EXISTS "Affiliates can view own promotions" ON public.affiliate_business_promotions;
DROP POLICY IF EXISTS "Staff can view all promotions" ON public.affiliate_business_promotions;
DROP POLICY IF EXISTS "Staff can delete promotions" ON public.affiliate_business_promotions;
DROP POLICY IF EXISTS "Staff can insert promotions" ON public.affiliate_business_promotions;
DROP POLICY IF EXISTS "Staff can update promotions" ON public.affiliate_business_promotions;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Public can view promotions"
  ON public.affiliate_business_promotions FOR SELECT
  USING (true);

CREATE POLICY "Staff can insert promotions"
  ON public.affiliate_business_promotions FOR INSERT
  WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update promotions"
  ON public.affiliate_business_promotions FOR UPDATE
  USING (is_staff(auth.uid()));

CREATE POLICY "Staff can delete promotions"
  ON public.affiliate_business_promotions FOR DELETE
  USING (is_staff(auth.uid()));
