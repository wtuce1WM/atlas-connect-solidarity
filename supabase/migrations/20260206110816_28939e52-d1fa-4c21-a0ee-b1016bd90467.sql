-- Add Google Maps and Airbnb URL fields to businesses table
ALTER TABLE public.businesses 
ADD COLUMN google_maps_url text,
ADD COLUMN airbnb_url text;