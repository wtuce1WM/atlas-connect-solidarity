CREATE TABLE IF NOT EXISTS public.image_compression_log (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  original_url text not null,
  original_path text not null,
  original_size_kb integer,
  compressed_url text not null,
  compressed_path text not null,
  compressed_size_kb integer,
  created_at timestamptz not null default now(),
  reverted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_image_compression_log_business ON public.image_compression_log(business_id);
GRANT ALL ON public.image_compression_log TO service_role;
GRANT SELECT ON public.image_compression_log TO authenticated;
ALTER TABLE public.image_compression_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can view compression log" ON public.image_compression_log;
CREATE POLICY "Staff can view compression log" ON public.image_compression_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));