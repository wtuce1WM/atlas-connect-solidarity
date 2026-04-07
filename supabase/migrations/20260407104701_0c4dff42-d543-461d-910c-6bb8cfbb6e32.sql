CREATE TABLE public.front_structure_services (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  front_structure_id uuid NOT NULL REFERENCES public.front_structure(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(front_structure_id, service_id)
);

ALTER TABLE public.front_structure_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "front_structure_services_select" ON public.front_structure_services FOR SELECT TO public USING (true);
CREATE POLICY "front_structure_services_insert" ON public.front_structure_services FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "front_structure_services_update" ON public.front_structure_services FOR UPDATE TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "front_structure_services_delete" ON public.front_structure_services FOR DELETE TO authenticated USING (is_staff(auth.uid()));