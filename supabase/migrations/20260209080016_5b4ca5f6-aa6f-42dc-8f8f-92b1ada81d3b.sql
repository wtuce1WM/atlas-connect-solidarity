-- Add additional booking platform URL fields to businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS hotels_com_url text,
ADD COLUMN IF NOT EXISTS trivago_url text,
ADD COLUMN IF NOT EXISTS other_booking_url text;