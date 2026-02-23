-- Add keywords column to subcategories (same pattern as services.keywords)
ALTER TABLE public.subcategories
ADD COLUMN keywords text[] DEFAULT '{}'::text[];

-- Seed existing overrides as data
UPDATE public.subcategories SET keywords = ARRAY['baguette', 'baguettes', 'pain français', 'pain francais', 'pain'] WHERE name_fr = 'Boulangerie';
UPDATE public.subcategories SET keywords = ARRAY['taxi', 'taxis', 'chauffeur privé', 'navette', 'transfert', 'vtc'] WHERE name_fr = 'Taxi / Chauffeur privé';