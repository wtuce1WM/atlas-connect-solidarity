
CREATE TABLE public.hotel_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serp_hotel_name text NOT NULL,
  city text NOT NULL,
  business_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (serp_hotel_name, city)
);

ALTER TABLE public.hotel_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hotel_mappings_select" ON public.hotel_mappings FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "hotel_mappings_insert" ON public.hotel_mappings FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "hotel_mappings_update" ON public.hotel_mappings FOR UPDATE TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "hotel_mappings_delete" ON public.hotel_mappings FOR DELETE TO authenticated USING (is_staff(auth.uid()));
