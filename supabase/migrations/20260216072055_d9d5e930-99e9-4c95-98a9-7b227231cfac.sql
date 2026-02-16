
-- Junction tables for label-specific associations
CREATE TABLE public.label_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label_id uuid NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(label_id, category_id)
);

CREATE TABLE public.label_subcategories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label_id uuid NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
  subcategory_id uuid NOT NULL REFERENCES public.subcategories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(label_id, subcategory_id)
);

CREATE TABLE public.label_cities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label_id uuid NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
  city_id uuid NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(label_id, city_id)
);

CREATE TABLE public.label_services (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label_id uuid NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(label_id, service_id)
);

CREATE TABLE public.label_neighborhoods (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label_id uuid NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
  neighborhood_id uuid NOT NULL REFERENCES public.neighborhoods(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(label_id, neighborhood_id)
);

-- RLS for all tables
ALTER TABLE public.label_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.label_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.label_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.label_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.label_neighborhoods ENABLE ROW LEVEL SECURITY;

-- SELECT: everyone
CREATE POLICY "label_categories_select" ON public.label_categories FOR SELECT USING (true);
CREATE POLICY "label_subcategories_select" ON public.label_subcategories FOR SELECT USING (true);
CREATE POLICY "label_cities_select" ON public.label_cities FOR SELECT USING (true);
CREATE POLICY "label_services_select" ON public.label_services FOR SELECT USING (true);
CREATE POLICY "label_neighborhoods_select" ON public.label_neighborhoods FOR SELECT USING (true);

-- INSERT/UPDATE/DELETE: staff only
CREATE POLICY "label_categories_insert" ON public.label_categories FOR INSERT WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "label_categories_update" ON public.label_categories FOR UPDATE USING (is_staff(auth.uid()));
CREATE POLICY "label_categories_delete" ON public.label_categories FOR DELETE USING (is_staff(auth.uid()));

CREATE POLICY "label_subcategories_insert" ON public.label_subcategories FOR INSERT WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "label_subcategories_update" ON public.label_subcategories FOR UPDATE USING (is_staff(auth.uid()));
CREATE POLICY "label_subcategories_delete" ON public.label_subcategories FOR DELETE USING (is_staff(auth.uid()));

CREATE POLICY "label_cities_insert" ON public.label_cities FOR INSERT WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "label_cities_update" ON public.label_cities FOR UPDATE USING (is_staff(auth.uid()));
CREATE POLICY "label_cities_delete" ON public.label_cities FOR DELETE USING (is_staff(auth.uid()));

CREATE POLICY "label_services_insert" ON public.label_services FOR INSERT WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "label_services_update" ON public.label_services FOR UPDATE USING (is_staff(auth.uid()));
CREATE POLICY "label_services_delete" ON public.label_services FOR DELETE USING (is_staff(auth.uid()));

CREATE POLICY "label_neighborhoods_insert" ON public.label_neighborhoods FOR INSERT WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "label_neighborhoods_update" ON public.label_neighborhoods FOR UPDATE USING (is_staff(auth.uid()));
CREATE POLICY "label_neighborhoods_delete" ON public.label_neighborhoods FOR DELETE USING (is_staff(auth.uid()));
