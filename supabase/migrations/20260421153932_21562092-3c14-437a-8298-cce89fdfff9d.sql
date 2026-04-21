CREATE TABLE public.business_document_cities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.business_documents(id) ON DELETE CASCADE,
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, city_id)
);
CREATE INDEX idx_bdc_document ON public.business_document_cities(document_id);
CREATE INDEX idx_bdc_city ON public.business_document_cities(city_id);

ALTER TABLE public.business_document_cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Document cities viewable by everyone"
  ON public.business_document_cities FOR SELECT USING (true);
CREATE POLICY "Staff can insert document cities"
  ON public.business_document_cities FOR INSERT WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can update document cities"
  ON public.business_document_cities FOR UPDATE USING (is_staff(auth.uid()));
CREATE POLICY "Staff can delete document cities"
  ON public.business_document_cities FOR DELETE USING (is_staff(auth.uid()));