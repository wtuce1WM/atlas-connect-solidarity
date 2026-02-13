
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS front_color TEXT NOT NULL DEFAULT 'white'
  CHECK (front_color IN ('black', 'white'));
