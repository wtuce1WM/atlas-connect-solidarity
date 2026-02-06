-- Add opening_hours column to businesses table
-- Structure: {"monday": {"open": "09:00", "close": "18:00", "closed": false}, ...}
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS opening_hours jsonb DEFAULT NULL;