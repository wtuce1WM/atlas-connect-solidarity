ALTER TABLE public.destinations ADD COLUMN IF NOT EXISTS keywords text[] DEFAULT '{}'::text[];
ALTER TABLE public.points_of_interest ADD COLUMN IF NOT EXISTS keywords text[] DEFAULT '{}'::text[];