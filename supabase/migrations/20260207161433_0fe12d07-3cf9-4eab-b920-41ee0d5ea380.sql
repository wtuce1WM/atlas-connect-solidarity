-- Change default value for show_opening_hours to false
ALTER TABLE public.businesses 
ALTER COLUMN show_opening_hours SET DEFAULT false;