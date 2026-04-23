ALTER TABLE public.front_structure_homepage_extra_cards
ADD COLUMN video_document_id uuid REFERENCES public.business_documents(id) ON DELETE SET NULL;