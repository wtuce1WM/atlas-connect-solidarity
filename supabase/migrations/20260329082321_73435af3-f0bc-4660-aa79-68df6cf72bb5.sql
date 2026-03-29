ALTER TABLE public.business_documents ADD COLUMN IF NOT EXISTS city text DEFAULT NULL;
ALTER TABLE public.business_documents ADD COLUMN IF NOT EXISTS description text DEFAULT NULL;