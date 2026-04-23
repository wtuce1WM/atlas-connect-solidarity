CREATE TABLE public.front_structure_homepage_overrides (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  front_structure_id uuid NOT NULL REFERENCES public.front_structure(id) ON DELETE CASCADE,
  city text NOT NULL,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (front_structure_id, city)
);

ALTER TABLE public.front_structure_homepage_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view overrides" ON public.front_structure_homepage_overrides
  FOR SELECT USING (is_staff(auth.uid()));
CREATE POLICY "Staff can insert overrides" ON public.front_structure_homepage_overrides
  FOR INSERT WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can update overrides" ON public.front_structure_homepage_overrides
  FOR UPDATE USING (is_staff(auth.uid()));
CREATE POLICY "Staff can delete overrides" ON public.front_structure_homepage_overrides
  FOR DELETE USING (is_staff(auth.uid()));

CREATE TRIGGER update_fs_homepage_overrides_updated_at
  BEFORE UPDATE ON public.front_structure_homepage_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();