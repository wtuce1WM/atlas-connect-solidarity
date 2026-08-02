ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS vat text;

CREATE POLICY "Affiliates can update own record"
ON public.affiliates FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE TABLE public.affiliate_legal_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_legal_documents TO authenticated;
GRANT ALL ON public.affiliate_legal_documents TO service_role;

ALTER TABLE public.affiliate_legal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates manage own legal documents"
ON public.affiliate_legal_documents FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.user_id = auth.uid()));

CREATE POLICY "Staff manage all legal documents"
ON public.affiliate_legal_documents FOR ALL TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.enforce_affiliate_legal_documents_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (SELECT count(*) FROM public.affiliate_legal_documents WHERE affiliate_id = NEW.affiliate_id) >= 10 THEN
    RAISE EXCEPTION 'Limite de 10 documents juridiques atteinte pour cet affilié';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_affiliate_legal_documents_limit
BEFORE INSERT ON public.affiliate_legal_documents
FOR EACH ROW EXECUTE FUNCTION public.enforce_affiliate_legal_documents_limit();

CREATE TRIGGER trg_affiliate_legal_documents_updated_at
BEFORE UPDATE ON public.affiliate_legal_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();