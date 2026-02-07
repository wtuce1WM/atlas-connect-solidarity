-- Add is_active column to businesses table
ALTER TABLE public.businesses 
ADD COLUMN is_active boolean NOT NULL DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN public.businesses.is_active IS 'Whether the business is active and visible on the frontend';