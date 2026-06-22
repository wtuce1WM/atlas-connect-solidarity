ALTER TABLE public.front_structure_homepage_overrides ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.front_structure_homepage_overrides ALTER COLUMN business_id DROP NOT NULL;