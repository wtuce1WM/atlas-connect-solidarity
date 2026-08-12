CREATE TABLE public.video_scenario_step_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  step_id uuid NOT NULL REFERENCES public.video_scenario_steps(id) ON DELETE CASCADE,
  title text,
  content text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_vssn_step ON public.video_scenario_step_notes(step_id, position);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_scenario_step_notes TO authenticated;
GRANT ALL ON public.video_scenario_step_notes TO service_role;

ALTER TABLE public.video_scenario_step_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage video scenario step notes"
ON public.video_scenario_step_notes FOR ALL TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER trg_vssn_updated_at
BEFORE UPDATE ON public.video_scenario_step_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();