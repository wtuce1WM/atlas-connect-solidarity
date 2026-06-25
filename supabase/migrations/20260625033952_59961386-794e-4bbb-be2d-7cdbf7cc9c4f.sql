
CREATE TABLE public.video_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  prompt text NOT NULL,
  duration_sec integer NOT NULL DEFAULT 22 CHECK (duration_sec BETWEEN 10 AND 40),
  tone text NOT NULL DEFAULT 'immersif',
  scenario_json jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','rendering','done','error')),
  output_url text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.video_jobs TO anon, authenticated;
GRANT ALL ON public.video_jobs TO service_role;

ALTER TABLE public.video_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read video jobs"
  ON public.video_jobs FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create video jobs"
  ON public.video_jobs FOR INSERT
  WITH CHECK (true);

CREATE TRIGGER update_video_jobs_updated_at
  BEFORE UPDATE ON public.video_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.video_jobs;
ALTER TABLE public.video_jobs REPLICA IDENTITY FULL;
