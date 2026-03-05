
-- Junction table: which services are filtered in which cities
CREATE TABLE public.service_city_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  city_id uuid NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (service_id, city_id)
);

ALTER TABLE public.service_city_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_city_filters_select" ON public.service_city_filters FOR SELECT USING (true);
CREATE POLICY "service_city_filters_insert" ON public.service_city_filters FOR INSERT WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "service_city_filters_update" ON public.service_city_filters FOR UPDATE USING (is_staff(auth.uid()));
CREATE POLICY "service_city_filters_delete" ON public.service_city_filters FOR DELETE USING (is_staff(auth.uid()));
