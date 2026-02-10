-- Add is_master boolean to businesses table
ALTER TABLE public.businesses ADD COLUMN is_master boolean NOT NULL DEFAULT false;