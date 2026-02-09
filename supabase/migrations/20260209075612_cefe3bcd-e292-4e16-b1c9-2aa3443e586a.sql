-- Add vacation_dates field to businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS vacation_dates jsonb DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.businesses.vacation_dates IS 'Array of vacation periods with start_date and end_date';