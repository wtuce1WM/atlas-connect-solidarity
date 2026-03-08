ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS menu_summary text,
  ADD COLUMN IF NOT EXISTS avg_price_range jsonb;