ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS website_force_external boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reserve_now_force_external boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS online_shop_force_external boolean NOT NULL DEFAULT false;