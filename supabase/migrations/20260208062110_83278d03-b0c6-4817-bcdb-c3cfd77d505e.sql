-- Add city_ids array to sponsors table for targeting specific cities
ALTER TABLE public.sponsors ADD COLUMN city_ids UUID[] DEFAULT '{}'::uuid[];