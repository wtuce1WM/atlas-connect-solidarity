-- Add account_type column to businesses table
ALTER TABLE public.businesses
ADD COLUMN account_type TEXT;