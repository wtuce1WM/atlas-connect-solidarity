
-- Add keywords column to cities table for typo handling and alternative names
ALTER TABLE public.cities ADD COLUMN keywords text[] DEFAULT '{}'::text[];
