
ALTER TABLE public.affiliate_business_promotions
  DROP CONSTRAINT IF EXISTS affiliate_business_promotions_affiliate_id_business_id_key;

ALTER TABLE public.affiliate_business_promotions
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS images text[] NOT NULL DEFAULT ARRAY[]::text[];

ALTER TABLE public.affiliate_business_promotions
  DROP CONSTRAINT IF EXISTS affiliate_business_promotions_images_max10;
ALTER TABLE public.affiliate_business_promotions
  ADD CONSTRAINT affiliate_business_promotions_images_max10
  CHECK (coalesce(array_length(images,1),0) <= 10);

DROP POLICY IF EXISTS "Public read affiliate promo images" ON storage.objects;
CREATE POLICY "Public read affiliate promo images"
ON storage.objects FOR SELECT
USING (bucket_id = 'affiliate-promotion-images');

DROP POLICY IF EXISTS "Staff manage affiliate promo images" ON storage.objects;
CREATE POLICY "Staff manage affiliate promo images"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'affiliate-promotion-images' AND public.is_staff(auth.uid()))
WITH CHECK (bucket_id = 'affiliate-promotion-images' AND public.is_staff(auth.uid()));
