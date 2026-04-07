ALTER TABLE public.business_documents 
  ADD COLUMN show_on_front boolean NOT NULL DEFAULT false,
  ADD COLUMN front_sort_order integer NOT NULL DEFAULT 0;