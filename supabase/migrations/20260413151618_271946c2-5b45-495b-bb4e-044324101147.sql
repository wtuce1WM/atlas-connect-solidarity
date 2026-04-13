ALTER TABLE public.events ADD COLUMN IF NOT EXISTS days_of_week text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS start_time text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS end_time text;