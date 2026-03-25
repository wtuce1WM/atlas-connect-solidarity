
CREATE TABLE public.certification_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certification_name TEXT NOT NULL UNIQUE,
  image_url TEXT,
  link_url TEXT,
  link_title TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.certification_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage certification metadata"
  ON public.certification_metadata
  FOR ALL
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Public read certification metadata"
  ON public.certification_metadata
  FOR SELECT
  TO anon
  USING (true);

-- Storage bucket for certification images
INSERT INTO storage.buckets (id, name, public) VALUES ('certification-images', 'certification-images', true);

CREATE POLICY "Staff can upload certification images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'certification-images' AND public.is_staff(auth.uid()));

CREATE POLICY "Staff can update certification images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'certification-images' AND public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete certification images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'certification-images' AND public.is_staff(auth.uid()));

CREATE POLICY "Public can read certification images"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'certification-images');

CREATE POLICY "Authenticated can read certification images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'certification-images');
