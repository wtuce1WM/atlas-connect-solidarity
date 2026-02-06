-- Add priority_score column to cities table
ALTER TABLE public.cities ADD COLUMN priority_score integer DEFAULT 0;

-- Create index for sorting by priority
CREATE INDEX idx_cities_priority_score ON public.cities(priority_score DESC);