CREATE TABLE public.homepage_cards_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city TEXT NOT NULL UNIQUE,
  payload JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.homepage_cards_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view homepage snapshots"
  ON public.homepage_cards_snapshots FOR SELECT USING (true);

CREATE POLICY "Staff can insert homepage snapshots"
  ON public.homepage_cards_snapshots FOR INSERT WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update homepage snapshots"
  ON public.homepage_cards_snapshots FOR UPDATE USING (is_staff(auth.uid()));

CREATE POLICY "Staff can delete homepage snapshots"
  ON public.homepage_cards_snapshots FOR DELETE USING (is_staff(auth.uid()));

CREATE TRIGGER update_homepage_cards_snapshots_updated_at
  BEFORE UPDATE ON public.homepage_cards_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();