
CREATE TABLE public.homepage_selections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  front_structure_id UUID NOT NULL REFERENCES public.front_structure(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (front_structure_id, business_id, city)
);

ALTER TABLE public.homepage_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "homepage_selections_select" ON public.homepage_selections FOR SELECT TO public USING (true);
CREATE POLICY "homepage_selections_insert" ON public.homepage_selections FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "homepage_selections_update" ON public.homepage_selections FOR UPDATE TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "homepage_selections_delete" ON public.homepage_selections FOR DELETE TO authenticated USING (is_staff(auth.uid()));
