ALTER TABLE public.business_destinations 
  ADD COLUMN hook text DEFAULT NULL,
  ADD COLUMN description text DEFAULT NULL;