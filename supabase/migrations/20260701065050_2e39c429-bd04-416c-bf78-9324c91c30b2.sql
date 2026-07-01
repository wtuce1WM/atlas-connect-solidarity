
ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS description_fr text, ADD COLUMN IF NOT EXISTS description_en text, ADD COLUMN IF NOT EXISTS description_ar text;
UPDATE public.badges SET description_fr = description WHERE description_fr IS NULL AND description IS NOT NULL;

ALTER TABLE public.cities ADD COLUMN IF NOT EXISTS description_fr text, ADD COLUMN IF NOT EXISTS description_en text, ADD COLUMN IF NOT EXISTS description_ar text;
UPDATE public.cities SET description_fr = description WHERE description_fr IS NULL AND description IS NOT NULL;

ALTER TABLE public.destinations ADD COLUMN IF NOT EXISTS description_fr text, ADD COLUMN IF NOT EXISTS description_en text, ADD COLUMN IF NOT EXISTS description_ar text;
UPDATE public.destinations SET description_fr = description WHERE description_fr IS NULL AND description IS NOT NULL;

ALTER TABLE public.points_of_interest ADD COLUMN IF NOT EXISTS description_fr text, ADD COLUMN IF NOT EXISTS description_en text, ADD COLUMN IF NOT EXISTS description_ar text;
UPDATE public.points_of_interest SET description_fr = description WHERE description_fr IS NULL AND description IS NOT NULL;

ALTER TABLE public.subcategories ADD COLUMN IF NOT EXISTS description_en text, ADD COLUMN IF NOT EXISTS description_ar text;
