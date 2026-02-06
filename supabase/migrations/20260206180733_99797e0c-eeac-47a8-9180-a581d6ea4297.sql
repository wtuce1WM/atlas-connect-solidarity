-- Add official site columns with name and URL for each
ALTER TABLE public.cities 
ADD COLUMN official_site_1_name text,
ADD COLUMN official_site_1_url text,
ADD COLUMN official_site_2_name text,
ADD COLUMN official_site_2_url text,
ADD COLUMN official_site_3_name text,
ADD COLUMN official_site_3_url text,
ADD COLUMN official_site_4_name text,
ADD COLUMN official_site_4_url text;