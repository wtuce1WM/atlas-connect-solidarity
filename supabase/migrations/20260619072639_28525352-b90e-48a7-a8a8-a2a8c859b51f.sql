
ALTER TABLE public.affiliate_business_promotions
  ALTER COLUMN promotion_type DROP NOT NULL,
  ALTER COLUMN promotion_type DROP DEFAULT,
  ALTER COLUMN promotion_value DROP NOT NULL,
  ALTER COLUMN promotion_value DROP DEFAULT,
  ALTER COLUMN promotion_currency DROP NOT NULL,
  ALTER COLUMN promotion_currency DROP DEFAULT;
