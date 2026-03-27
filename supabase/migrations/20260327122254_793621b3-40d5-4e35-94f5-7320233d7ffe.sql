
ALTER TABLE public.business_documents
  ADD COLUMN poi_id uuid REFERENCES public.points_of_interest(id) ON DELETE SET NULL,
  ADD COLUMN destination_id uuid REFERENCES public.destinations(id) ON DELETE SET NULL;
