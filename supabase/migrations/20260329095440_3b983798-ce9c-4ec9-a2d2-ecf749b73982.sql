
-- Table for front structure entries (libre names like "Hébergement", "Gastronomie")
CREATE TABLE public.front_structure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.front_structure ENABLE ROW LEVEL SECURITY;

CREATE POLICY "front_structure_select" ON public.front_structure FOR SELECT TO public USING (true);
CREATE POLICY "front_structure_insert" ON public.front_structure FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "front_structure_update" ON public.front_structure FOR UPDATE TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "front_structure_delete" ON public.front_structure FOR DELETE TO authenticated USING (is_staff(auth.uid()));

-- Junction table linking front_structure entries to subcategories
CREATE TABLE public.front_structure_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  front_structure_id uuid NOT NULL REFERENCES public.front_structure(id) ON DELETE CASCADE,
  subcategory_id uuid NOT NULL REFERENCES public.subcategories(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (front_structure_id, subcategory_id)
);

ALTER TABLE public.front_structure_subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fss_select" ON public.front_structure_subcategories FOR SELECT TO public USING (true);
CREATE POLICY "fss_insert" ON public.front_structure_subcategories FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "fss_update" ON public.front_structure_subcategories FOR UPDATE TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "fss_delete" ON public.front_structure_subcategories FOR DELETE TO authenticated USING (is_staff(auth.uid()));
