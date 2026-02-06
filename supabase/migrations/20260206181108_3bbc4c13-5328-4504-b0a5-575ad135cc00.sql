-- Add description column for cities (HTML content, max 10000 chars)
ALTER TABLE public.cities 
ADD COLUMN description text;