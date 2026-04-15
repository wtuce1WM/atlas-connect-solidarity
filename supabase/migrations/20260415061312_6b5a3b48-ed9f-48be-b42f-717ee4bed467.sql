-- Junction table for video ↔ badges (many-to-many)
CREATE TABLE public.business_document_badges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES public.business_documents(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (document_id, badge_id)
);

ALTER TABLE public.business_document_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view document badges"
  ON public.business_document_badges FOR SELECT USING (true);

CREATE POLICY "Staff can insert document badges"
  ON public.business_document_badges FOR INSERT
  WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update document badges"
  ON public.business_document_badges FOR UPDATE
  USING (is_staff(auth.uid()));

CREATE POLICY "Staff can delete document badges"
  ON public.business_document_badges FOR DELETE
  USING (is_staff(auth.uid()));

-- Add event_id column to business_documents
ALTER TABLE public.business_documents
  ADD COLUMN event_id uuid REFERENCES public.events(id) ON DELETE SET NULL;