-- Add Wikipedia URL columns for each language
ALTER TABLE public.cities 
ADD COLUMN wikipedia_fr text,
ADD COLUMN wikipedia_en text,
ADD COLUMN wikipedia_ar text;