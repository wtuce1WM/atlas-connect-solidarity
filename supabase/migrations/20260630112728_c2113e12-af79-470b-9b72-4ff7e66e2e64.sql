
-- Businesses: multilingual description
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS description_fr text,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS description_ar text;

UPDATE public.businesses
SET description_fr = description
WHERE description_fr IS NULL AND description IS NOT NULL AND description <> '';

-- Front highlights: multilingual fields
ALTER TABLE public.front_highlights
  ADD COLUMN IF NOT EXISTS title_fr text,
  ADD COLUMN IF NOT EXISTS title_en text,
  ADD COLUMN IF NOT EXISTS title_ar text,
  ADD COLUMN IF NOT EXISTS description_fr text,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS description_ar text,
  ADD COLUMN IF NOT EXISTS section_title_fr text,
  ADD COLUMN IF NOT EXISTS section_title_en text,
  ADD COLUMN IF NOT EXISTS section_title_ar text,
  ADD COLUMN IF NOT EXISTS section_intro_fr text,
  ADD COLUMN IF NOT EXISTS section_intro_en text,
  ADD COLUMN IF NOT EXISTS section_intro_ar text,
  ADD COLUMN IF NOT EXISTS metric_title_fr text,
  ADD COLUMN IF NOT EXISTS metric_title_en text,
  ADD COLUMN IF NOT EXISTS metric_title_ar text,
  ADD COLUMN IF NOT EXISTS metric_value_fr text,
  ADD COLUMN IF NOT EXISTS metric_value_en text,
  ADD COLUMN IF NOT EXISTS metric_value_ar text;

UPDATE public.front_highlights
SET
  title_fr         = COALESCE(title_fr, NULLIF(title, '')),
  description_fr   = COALESCE(description_fr, NULLIF(description, '')),
  section_title_fr = COALESCE(section_title_fr, NULLIF(section_title, '')),
  section_intro_fr = COALESCE(section_intro_fr, NULLIF(section_intro, '')),
  metric_title_fr  = COALESCE(metric_title_fr, NULLIF(metric_title, '')),
  metric_value_fr  = COALESCE(metric_value_fr, NULLIF(metric_value, ''));
