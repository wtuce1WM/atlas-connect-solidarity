-- Add a name field for the "Other booking platform"
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS other_booking_name text;