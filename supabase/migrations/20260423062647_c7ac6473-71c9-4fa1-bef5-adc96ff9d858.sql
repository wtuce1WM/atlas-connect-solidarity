CREATE TABLE public.front_structure_homepage_order (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('entry', 'extra')),
  item_id UUID NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (city, item_type, item_id)
);

CREATE INDEX idx_fsh_order_city ON public.front_structure_homepage_order (city, sort_order);

ALTER TABLE public.front_structure_homepage_order ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read homepage order"
  ON public.front_structure_homepage_order
  FOR SELECT
  USING (true);

CREATE POLICY "Staff can insert homepage order"
  ON public.front_structure_homepage_order
  FOR INSERT
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update homepage order"
  ON public.front_structure_homepage_order
  FOR UPDATE
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete homepage order"
  ON public.front_structure_homepage_order
  FOR DELETE
  USING (public.is_staff(auth.uid()));

CREATE TRIGGER update_fsh_order_updated_at
  BEFORE UPDATE ON public.front_structure_homepage_order
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();