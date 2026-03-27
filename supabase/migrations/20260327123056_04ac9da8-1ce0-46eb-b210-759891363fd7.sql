
ALTER TABLE public.business_documents
  DROP CONSTRAINT IF EXISTS business_documents_poi_id_fkey;

ALTER TABLE public.business_documents
  ADD CONSTRAINT business_documents_poi_id_fkey
  FOREIGN KEY (poi_id) REFERENCES public.businesses(id) ON DELETE SET NULL;
