-- Add color_hex column to gammes table
ALTER TABLE public.gammes 
ADD COLUMN color_hex VARCHAR(7) DEFAULT '#000000';