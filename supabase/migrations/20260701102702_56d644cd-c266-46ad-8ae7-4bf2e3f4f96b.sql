ALTER TABLE public.affiliate_business_promotions
  ADD COLUMN IF NOT EXISTS title_fr TEXT,
  ADD COLUMN IF NOT EXISTS title_en TEXT,
  ADD COLUMN IF NOT EXISTS title_ar TEXT,
  ADD COLUMN IF NOT EXISTS promotion_message_fr TEXT,
  ADD COLUMN IF NOT EXISTS promotion_message_en TEXT,
  ADD COLUMN IF NOT EXISTS promotion_message_ar TEXT;

UPDATE public.affiliate_business_promotions
SET title_fr = COALESCE(title_fr, title),
    promotion_message_fr = COALESCE(promotion_message_fr, promotion_message)
WHERE (title IS NOT NULL AND title_fr IS NULL)
   OR (promotion_message IS NOT NULL AND promotion_message_fr IS NULL);