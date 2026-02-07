-- Add a boolean field to control opening hours visibility
ALTER TABLE public.businesses
ADD COLUMN show_opening_hours BOOLEAN DEFAULT true;