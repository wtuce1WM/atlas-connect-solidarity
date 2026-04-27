ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS og_image_url TEXT;
ALTER TABLE public.subcategories ADD COLUMN IF NOT EXISTS og_image_url TEXT;