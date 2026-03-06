
CREATE TABLE public.business_poi_businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  poi_business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, poi_business_id)
);

ALTER TABLE public.business_poi_businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_poi_businesses_select" ON public.business_poi_businesses FOR SELECT USING (true);
CREATE POLICY "business_poi_businesses_insert" ON public.business_poi_businesses FOR INSERT WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "business_poi_businesses_update" ON public.business_poi_businesses FOR UPDATE USING (is_staff(auth.uid()));
CREATE POLICY "business_poi_businesses_delete" ON public.business_poi_businesses FOR DELETE USING (is_staff(auth.uid()));
