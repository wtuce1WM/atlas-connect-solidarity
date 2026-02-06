-- Add ICE (Identifiant Commun de l'Entreprise) column to businesses table
-- Limited to 20 characters (digits only validation will be handled in application)
ALTER TABLE public.businesses
ADD COLUMN ice VARCHAR(20);