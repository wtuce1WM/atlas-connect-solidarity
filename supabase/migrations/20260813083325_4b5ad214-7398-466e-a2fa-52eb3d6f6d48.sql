-- 1) Affiliate private notes
CREATE TABLE public.business_affiliate_notes (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  note text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_affiliate_notes TO authenticated;
GRANT ALL ON public.business_affiliate_notes TO service_role;

ALTER TABLE public.business_affiliate_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage affiliate notes"
ON public.business_affiliate_notes FOR ALL TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Owner affiliate manages own business note"
ON public.business_affiliate_notes FOR ALL TO authenticated
USING (public.is_own_affiliate_business(auth.uid(), business_id))
WITH CHECK (public.is_own_affiliate_business(auth.uid(), business_id));

INSERT INTO public.business_affiliate_notes (business_id, note)
SELECT id, affiliate_private_note
FROM public.businesses
WHERE affiliate_private_note IS NOT NULL AND btrim(affiliate_private_note) <> '';

ALTER TABLE public.businesses DROP COLUMN affiliate_private_note;

-- 2) Video scenario internal notes (staff only), keyed by scenario mode
CREATE TABLE public.video_scenario_internal_notes (
  mode text PRIMARY KEY REFERENCES public.video_scenario_configs(mode) ON DELETE CASCADE,
  note text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_scenario_internal_notes TO authenticated;
GRANT ALL ON public.video_scenario_internal_notes TO service_role;

ALTER TABLE public.video_scenario_internal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage video scenario internal notes"
ON public.video_scenario_internal_notes FOR ALL TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

INSERT INTO public.video_scenario_internal_notes (mode, note)
SELECT mode, internal_note
FROM public.video_scenario_configs
WHERE internal_note IS NOT NULL AND btrim(internal_note) <> '';

ALTER TABLE public.video_scenario_configs DROP COLUMN internal_note;

-- 3) updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_business_affiliate_notes_touch
BEFORE UPDATE ON public.business_affiliate_notes
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_video_scenario_internal_notes_touch
BEFORE UPDATE ON public.video_scenario_internal_notes
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();