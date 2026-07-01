ALTER TABLE public.neighborhoods
  ADD COLUMN IF NOT EXISTS name_en text,
  ADD COLUMN IF NOT EXISTS name_ar text,
  ADD COLUMN IF NOT EXISTS keywords_en text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS keywords_ar text[] DEFAULT '{}'::text[];