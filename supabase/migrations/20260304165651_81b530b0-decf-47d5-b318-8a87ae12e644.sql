CREATE TABLE public.business_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('menu', 'flipbook')),
  url text NOT NULL,
  name text,
  language text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_documents_select" ON public.business_documents FOR SELECT USING (true);
CREATE POLICY "business_documents_insert" ON public.business_documents FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "business_documents_update" ON public.business_documents FOR UPDATE TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "business_documents_delete" ON public.business_documents FOR DELETE TO authenticated USING (is_staff(auth.uid()));

-- Migrate existing menu data
INSERT INTO public.business_documents (business_id, type, url, name, language, sort_order)
SELECT id, 'menu', menu_url, menu_name, menu_language, 0
FROM public.businesses
WHERE menu_url IS NOT NULL AND menu_url != '';

-- Migrate existing flipbook data
INSERT INTO public.business_documents (business_id, type, url, name, language, sort_order)
SELECT id, 'flipbook', flipbook_url, flipbook_name, flipbook_language, 0
FROM public.businesses
WHERE flipbook_url IS NOT NULL AND flipbook_url != '';