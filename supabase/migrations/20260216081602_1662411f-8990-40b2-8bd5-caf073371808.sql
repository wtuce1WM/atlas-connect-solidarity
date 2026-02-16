
-- Add country_id to affiliates, referencing countries table
ALTER TABLE public.affiliates ADD COLUMN country_id uuid REFERENCES public.countries(id);

-- Set all existing affiliates to Morocco (assuming it's the first/only country)
UPDATE public.affiliates SET country_id = (SELECT id FROM public.countries WHERE name_fr = 'Maroc' LIMIT 1);

-- Make it NOT NULL after backfilling
ALTER TABLE public.affiliates ALTER COLUMN country_id SET NOT NULL;
