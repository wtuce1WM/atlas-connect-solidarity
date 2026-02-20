-- Add image_url column to destinations
ALTER TABLE public.destinations ADD COLUMN image_url text;

-- Add image_url column to points_of_interest
ALTER TABLE public.points_of_interest ADD COLUMN image_url text;