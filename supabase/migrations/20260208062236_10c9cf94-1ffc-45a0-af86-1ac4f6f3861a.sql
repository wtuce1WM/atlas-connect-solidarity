-- Add internal_notes field to sponsors table
ALTER TABLE public.sponsors ADD COLUMN internal_notes TEXT;