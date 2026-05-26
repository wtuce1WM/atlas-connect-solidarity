CREATE TABLE public.vanity_urls (
  slug text PRIMARY KEY,
  target_type text NOT NULL CHECK (target_type IN ('business','destination')),
  target_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_vanity_urls_target ON public.vanity_urls(target_type, target_id);

GRANT SELECT ON public.vanity_urls TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vanity_urls TO authenticated;
GRANT ALL ON public.vanity_urls TO service_role;

ALTER TABLE public.vanity_urls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read vanity urls"
  ON public.vanity_urls FOR SELECT
  USING (true);

CREATE POLICY "Staff can insert vanity urls"
  ON public.vanity_urls FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update vanity urls"
  ON public.vanity_urls FOR UPDATE
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete vanity urls"
  ON public.vanity_urls FOR DELETE
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE TRIGGER vanity_urls_updated_at
  BEFORE UPDATE ON public.vanity_urls
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();