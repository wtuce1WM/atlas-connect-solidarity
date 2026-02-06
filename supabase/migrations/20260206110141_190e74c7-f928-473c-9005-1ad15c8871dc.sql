-- Add internal notes field to businesses table
ALTER TABLE public.businesses 
ADD COLUMN internal_notes text;