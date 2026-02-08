-- Add adjective fields to subcategories table
ALTER TABLE public.subcategories
ADD COLUMN adj_fr text,
ADD COLUMN adj_en text,
ADD COLUMN adj_ar text;