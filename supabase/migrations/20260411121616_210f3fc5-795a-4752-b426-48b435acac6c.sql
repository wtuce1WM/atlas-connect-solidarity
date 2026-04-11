ALTER TABLE public.events ADD COLUMN url text DEFAULT NULL;
ALTER TABLE public.events ADD COLUMN url_cta text DEFAULT NULL;
ALTER TABLE public.events ADD COLUMN url_force_external boolean DEFAULT false;