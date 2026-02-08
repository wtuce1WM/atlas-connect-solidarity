-- Add URL fields per language to labels table
ALTER TABLE public.labels
ADD COLUMN url_fr TEXT,
ADD COLUMN url_en TEXT,
ADD COLUMN url_ar TEXT;