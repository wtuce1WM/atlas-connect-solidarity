-- Add TripAdvisor and Booking URL fields to businesses table
ALTER TABLE public.businesses 
ADD COLUMN tripadvisor_url text,
ADD COLUMN booking_url text;