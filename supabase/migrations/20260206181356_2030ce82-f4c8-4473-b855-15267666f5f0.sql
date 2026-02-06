-- Add official_site_5 and official_site_6 columns for cities
ALTER TABLE public.cities 
ADD COLUMN official_site_5_name text,
ADD COLUMN official_site_5_url text,
ADD COLUMN official_site_6_name text,
ADD COLUMN official_site_6_url text;