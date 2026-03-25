
CREATE TABLE public.broken_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  business_id uuid NOT NULL,
  field_name text NOT NULL,
  http_status integer,
  error_message text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (url, business_id, field_name)
);

ALTER TABLE public.broken_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "broken_links_select" ON public.broken_links FOR SELECT TO public USING (true);
CREATE POLICY "broken_links_insert" ON public.broken_links FOR INSERT TO public WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "broken_links_update" ON public.broken_links FOR UPDATE TO public USING (is_staff(auth.uid()));
CREATE POLICY "broken_links_delete" ON public.broken_links FOR DELETE TO public USING (is_staff(auth.uid()));
