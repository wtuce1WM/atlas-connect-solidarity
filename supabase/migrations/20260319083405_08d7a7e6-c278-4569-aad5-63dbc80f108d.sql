
-- Table for web-only business content (description, images, videos)
CREATE TABLE public.business_web_only (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  description text DEFAULT '',
  images text[] DEFAULT '{}',
  videos text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id)
);

ALTER TABLE public.business_web_only ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_web_only_select" ON public.business_web_only
  FOR SELECT TO public USING (true);

CREATE POLICY "business_web_only_insert" ON public.business_web_only
  FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "business_web_only_update" ON public.business_web_only
  FOR UPDATE TO authenticated USING (is_staff(auth.uid()));

CREATE POLICY "business_web_only_delete" ON public.business_web_only
  FOR DELETE TO authenticated USING (is_staff(auth.uid()));

-- Storage bucket for web-only media (images + videos)
INSERT INTO storage.buckets (id, name, public) VALUES ('web-only-media', 'web-only-media', true);

CREATE POLICY "Staff can upload web-only media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'web-only-media' AND is_staff(auth.uid()));

CREATE POLICY "Staff can update web-only media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'web-only-media' AND is_staff(auth.uid()));

CREATE POLICY "Staff can delete web-only media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'web-only-media' AND is_staff(auth.uid()));

CREATE POLICY "Anyone can view web-only media"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'web-only-media');
