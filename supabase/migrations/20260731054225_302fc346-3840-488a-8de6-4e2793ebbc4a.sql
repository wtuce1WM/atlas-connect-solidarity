ALTER TABLE public.club_ai_suggestions
  ADD COLUMN IF NOT EXISTS mode text,
  ADD COLUMN IF NOT EXISTS destination_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS subcategory_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS badge_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS disabled_followup_ids uuid[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.club_ai_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label_fr text NOT NULL,
  label_en text,
  label_ar text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.club_ai_followups TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_ai_followups TO authenticated;
GRANT ALL ON public.club_ai_followups TO service_role;

ALTER TABLE public.club_ai_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club followups are viewable by everyone"
  ON public.club_ai_followups FOR SELECT USING (true);

CREATE POLICY "Staff can insert club followups"
  ON public.club_ai_followups FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update club followups"
  ON public.club_ai_followups FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete club followups"
  ON public.club_ai_followups FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE TRIGGER update_club_ai_followups_updated_at
  BEFORE UPDATE ON public.club_ai_followups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();