ALTER TABLE public.business_documents
ADD COLUMN IF NOT EXISTS hide_logo boolean NOT NULL DEFAULT false;