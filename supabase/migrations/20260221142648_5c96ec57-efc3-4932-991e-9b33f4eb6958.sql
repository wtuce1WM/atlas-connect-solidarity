
-- Table for affiliate business promotions
CREATE TABLE public.affiliate_business_promotions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  promotion_type text NOT NULL DEFAULT 'percentage' CHECK (promotion_type IN ('percentage', 'fixed')),
  promotion_value numeric NOT NULL DEFAULT 0,
  promotion_currency text NOT NULL DEFAULT 'MAD' CHECK (promotion_currency IN ('MAD', 'EUR')),
  promotion_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(affiliate_id, business_id)
);

-- Enable RLS
ALTER TABLE public.affiliate_business_promotions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Staff can view all promotions"
ON public.affiliate_business_promotions FOR SELECT
USING (is_staff(auth.uid()));

CREATE POLICY "Staff can insert promotions"
ON public.affiliate_business_promotions FOR INSERT
WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update promotions"
ON public.affiliate_business_promotions FOR UPDATE
USING (is_staff(auth.uid()));

CREATE POLICY "Staff can delete promotions"
ON public.affiliate_business_promotions FOR DELETE
USING (is_staff(auth.uid()));

-- Affiliates can view their own promotions
CREATE POLICY "Affiliates can view own promotions"
ON public.affiliate_business_promotions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.affiliates
    WHERE affiliates.id = affiliate_business_promotions.affiliate_id
    AND affiliates.user_id = auth.uid()
  )
);

-- Public can view promotions (for display on business pages)
CREATE POLICY "Public can view promotions"
ON public.affiliate_business_promotions FOR SELECT
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_affiliate_business_promotions_updated_at
BEFORE UPDATE ON public.affiliate_business_promotions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
