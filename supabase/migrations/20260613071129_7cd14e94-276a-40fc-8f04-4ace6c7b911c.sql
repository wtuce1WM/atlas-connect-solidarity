
CREATE TABLE public.page_meta_overrides (
  route_pattern text PRIMARY KEY,
  title text,
  description text,
  og_image text,
  og_type text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.page_meta_overrides TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_meta_overrides TO authenticated;
GRANT ALL ON public.page_meta_overrides TO service_role;

ALTER TABLE public.page_meta_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read page meta overrides"
  ON public.page_meta_overrides FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage page meta overrides"
  ON public.page_meta_overrides FOR ALL
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER trg_page_meta_overrides_updated_at
  BEFORE UPDATE ON public.page_meta_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
