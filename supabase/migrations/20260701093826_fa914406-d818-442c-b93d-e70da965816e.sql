
ALTER TABLE public.business_image_titles
  ADD COLUMN IF NOT EXISTS title_fr TEXT,
  ADD COLUMN IF NOT EXISTS title_en TEXT,
  ADD COLUMN IF NOT EXISTS title_ar TEXT,
  ADD COLUMN IF NOT EXISTS description_fr TEXT,
  ADD COLUMN IF NOT EXISTS description_en TEXT,
  ADD COLUMN IF NOT EXISTS description_ar TEXT;

UPDATE public.business_image_titles
  SET title_fr = COALESCE(title_fr, title),
      description_fr = COALESCE(description_fr, description);
