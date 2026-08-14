CREATE TABLE public.video_media_library (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NULL REFERENCES public.businesses(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('image','video')),
  url text NOT NULL,
  title text,
  tags text[] NOT NULL DEFAULT '{}',
  orientation text CHECK (orientation IN ('landscape','portrait','square')),
  duration_sec numeric,
  storage_path text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX video_media_library_business_idx ON public.video_media_library (business_id);
CREATE INDEX video_media_library_kind_idx ON public.video_media_library (kind);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_media_library TO authenticated;
GRANT ALL ON public.video_media_library TO service_role;

ALTER TABLE public.video_media_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage video media library"
ON public.video_media_library FOR ALL TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER video_media_library_updated_at
BEFORE UPDATE ON public.video_media_library
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "video-assets public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'video-assets');

CREATE POLICY "video-assets staff write"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'video-assets' AND public.is_staff(auth.uid()));

CREATE POLICY "video-assets staff update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'video-assets' AND public.is_staff(auth.uid()))
WITH CHECK (bucket_id = 'video-assets' AND public.is_staff(auth.uid()));

CREATE POLICY "video-assets staff delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'video-assets' AND public.is_staff(auth.uid()));