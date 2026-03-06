
-- Drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "service_city_filters_select" ON public.service_city_filters;
DROP POLICY IF EXISTS "service_city_filters_insert" ON public.service_city_filters;
DROP POLICY IF EXISTS "service_city_filters_update" ON public.service_city_filters;
DROP POLICY IF EXISTS "service_city_filters_delete" ON public.service_city_filters;

CREATE POLICY "service_city_filters_select" ON public.service_city_filters
  FOR SELECT USING (true);

CREATE POLICY "service_city_filters_insert" ON public.service_city_filters
  FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "service_city_filters_update" ON public.service_city_filters
  FOR UPDATE TO authenticated USING (is_staff(auth.uid()));

CREATE POLICY "service_city_filters_delete" ON public.service_city_filters
  FOR DELETE TO authenticated USING (is_staff(auth.uid()));
