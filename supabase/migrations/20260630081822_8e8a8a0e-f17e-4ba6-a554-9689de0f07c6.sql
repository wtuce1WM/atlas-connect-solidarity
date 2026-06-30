
CREATE TABLE public.translation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  source_lang text NOT NULL DEFAULT 'fr',
  target_lang text NOT NULL,
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'queued',
  total_rows integer NOT NULL DEFAULT 0,
  processed_rows integer NOT NULL DEFAULT 0,
  success_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  last_error text,
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.translation_jobs TO authenticated;
GRANT ALL ON public.translation_jobs TO service_role;

ALTER TABLE public.translation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view translation jobs"
  ON public.translation_jobs FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert translation jobs"
  ON public.translation_jobs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update translation jobs"
  ON public.translation_jobs FOR UPDATE
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete translation jobs"
  ON public.translation_jobs FOR DELETE
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE TRIGGER update_translation_jobs_updated_at
  BEFORE UPDATE ON public.translation_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_translation_jobs_status ON public.translation_jobs(status, created_at DESC);
