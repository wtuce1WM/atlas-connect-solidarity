CREATE TABLE public.search_service_filters (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword text NOT NULL,
  required_service text NOT NULL,
  subcategory_id uuid REFERENCES public.subcategories(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.search_service_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "search_service_filters_select" ON public.search_service_filters FOR SELECT USING (true);
CREATE POLICY "search_service_filters_insert" ON public.search_service_filters FOR INSERT WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "search_service_filters_update" ON public.search_service_filters FOR UPDATE USING (is_staff(auth.uid()));
CREATE POLICY "search_service_filters_delete" ON public.search_service_filters FOR DELETE USING (is_staff(auth.uid()));

COMMENT ON TABLE public.search_service_filters IS 'Maps query keywords to required services for filtering search results';