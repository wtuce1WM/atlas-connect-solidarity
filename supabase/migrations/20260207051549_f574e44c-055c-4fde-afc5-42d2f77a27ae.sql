-- Add a dedicated field for the "Réserver maintenant" button URL
ALTER TABLE public.businesses
ADD COLUMN reserve_now_url TEXT;