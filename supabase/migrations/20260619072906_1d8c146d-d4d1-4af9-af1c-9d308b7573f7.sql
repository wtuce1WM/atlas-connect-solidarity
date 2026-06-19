
ALTER TABLE public.affiliate_business_promotions
  ADD COLUMN IF NOT EXISTS savings_amount numeric;
