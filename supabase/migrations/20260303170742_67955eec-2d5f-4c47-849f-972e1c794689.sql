
-- Create a dedicated regions table
CREATE TABLE public.regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Regions are viewable by everyone" ON public.regions FOR SELECT USING (true);
CREATE POLICY "Staff can insert regions" ON public.regions FOR INSERT WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can update regions" ON public.regions FOR UPDATE USING (is_staff(auth.uid()));
CREATE POLICY "Staff can delete regions" ON public.regions FOR DELETE USING (is_staff(auth.uid()));

-- Seed with existing regions from cities and destinations
INSERT INTO public.regions (name)
SELECT DISTINCT unnested_region
FROM (
  SELECT region AS unnested_region FROM public.cities WHERE region IS NOT NULL AND region != ''
  UNION
  SELECT unnest(region) AS unnested_region FROM public.destinations WHERE region IS NOT NULL
) sub
WHERE unnested_region IS NOT NULL AND unnested_region != ''
ON CONFLICT (name) DO NOTHING;

-- Add the requested region
INSERT INTO public.regions (name) VALUES ('Guelmim-Oued Noun') ON CONFLICT (name) DO NOTHING;
