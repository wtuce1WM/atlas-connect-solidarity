ALTER TABLE public.points_of_interest 
ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS internal_notes text;