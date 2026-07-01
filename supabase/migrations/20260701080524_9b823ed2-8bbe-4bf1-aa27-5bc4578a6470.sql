
ALTER TABLE public.certification_metadata
  ADD COLUMN IF NOT EXISTS description_fr text,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS description_ar text,
  ADD COLUMN IF NOT EXISTS link_title_fr text,
  ADD COLUMN IF NOT EXISTS link_title_en text,
  ADD COLUMN IF NOT EXISTS link_title_ar text;

UPDATE public.certification_metadata
SET description_fr = COALESCE(description_fr, description),
    link_title_fr  = COALESCE(link_title_fr, link_title)
WHERE description_fr IS NULL OR link_title_fr IS NULL;

ALTER TABLE public.certification_metadata
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS link_title;
