-- Add label1_link_url column for clickable link on Label1 image
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS label1_link_url TEXT;