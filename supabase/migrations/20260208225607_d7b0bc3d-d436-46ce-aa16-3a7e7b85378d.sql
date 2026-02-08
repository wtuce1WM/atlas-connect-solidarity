-- Add adjective fields to categories table
ALTER TABLE public.categories
ADD COLUMN adj_fr text,
ADD COLUMN adj_en text,
ADD COLUMN adj_ar text;