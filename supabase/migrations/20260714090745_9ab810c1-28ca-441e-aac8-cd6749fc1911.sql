
-- 1) Nouvelles tables staff-only pour internal_notes
CREATE TABLE public.business_internal_notes (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_internal_notes TO authenticated;
GRANT ALL ON public.business_internal_notes TO service_role;
ALTER TABLE public.business_internal_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage business internal notes"
  ON public.business_internal_notes FOR ALL
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.sponsor_internal_notes (
  sponsor_id uuid PRIMARY KEY REFERENCES public.sponsors(id) ON DELETE CASCADE,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsor_internal_notes TO authenticated;
GRANT ALL ON public.sponsor_internal_notes TO service_role;
ALTER TABLE public.sponsor_internal_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage sponsor internal notes"
  ON public.sponsor_internal_notes FOR ALL
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.destination_internal_notes (
  destination_id uuid PRIMARY KEY REFERENCES public.destinations(id) ON DELETE CASCADE,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.destination_internal_notes TO authenticated;
GRANT ALL ON public.destination_internal_notes TO service_role;
ALTER TABLE public.destination_internal_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage destination internal notes"
  ON public.destination_internal_notes FOR ALL
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.poi_internal_notes (
  poi_id uuid PRIMARY KEY REFERENCES public.points_of_interest(id) ON DELETE CASCADE,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.poi_internal_notes TO authenticated;
GRANT ALL ON public.poi_internal_notes TO service_role;
ALTER TABLE public.poi_internal_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage poi internal notes"
  ON public.poi_internal_notes FOR ALL
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.affiliate_internal_notes (
  affiliate_id uuid PRIMARY KEY REFERENCES public.affiliates(id) ON DELETE CASCADE,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_internal_notes TO authenticated;
GRANT ALL ON public.affiliate_internal_notes TO service_role;
ALTER TABLE public.affiliate_internal_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage affiliate internal notes"
  ON public.affiliate_internal_notes FOR ALL
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- 2) Migration des données existantes
INSERT INTO public.business_internal_notes (business_id, notes)
SELECT id, internal_notes FROM public.businesses
WHERE internal_notes IS NOT NULL AND length(trim(internal_notes)) > 0
ON CONFLICT (business_id) DO NOTHING;

INSERT INTO public.sponsor_internal_notes (sponsor_id, notes)
SELECT id, internal_notes FROM public.sponsors
WHERE internal_notes IS NOT NULL AND length(trim(internal_notes)) > 0
ON CONFLICT (sponsor_id) DO NOTHING;

INSERT INTO public.destination_internal_notes (destination_id, notes)
SELECT id, internal_notes FROM public.destinations
WHERE internal_notes IS NOT NULL AND length(trim(internal_notes)) > 0
ON CONFLICT (destination_id) DO NOTHING;

INSERT INTO public.poi_internal_notes (poi_id, notes)
SELECT id, internal_notes FROM public.points_of_interest
WHERE internal_notes IS NOT NULL AND length(trim(internal_notes)) > 0
ON CONFLICT (poi_id) DO NOTHING;

INSERT INTO public.affiliate_internal_notes (affiliate_id, notes)
SELECT id, internal_notes FROM public.affiliates
WHERE internal_notes IS NOT NULL AND length(trim(internal_notes)) > 0
ON CONFLICT (affiliate_id) DO NOTHING;

-- 3) Suppression des colonnes publiques
ALTER TABLE public.businesses DROP COLUMN IF EXISTS internal_notes;
ALTER TABLE public.sponsors DROP COLUMN IF EXISTS internal_notes;
ALTER TABLE public.destinations DROP COLUMN IF EXISTS internal_notes;
ALTER TABLE public.points_of_interest DROP COLUMN IF EXISTS internal_notes;
ALTER TABLE public.affiliates DROP COLUMN IF EXISTS internal_notes;

-- 4) Nettoyage politique JWT redondante
DROP POLICY IF EXISTS "Staff can manage front highlights" ON public.front_highlights;

-- 5) Trigger updated_at
CREATE TRIGGER trg_business_internal_notes_updated_at
  BEFORE UPDATE ON public.business_internal_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sponsor_internal_notes_updated_at
  BEFORE UPDATE ON public.sponsor_internal_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_destination_internal_notes_updated_at
  BEFORE UPDATE ON public.destination_internal_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_poi_internal_notes_updated_at
  BEFORE UPDATE ON public.poi_internal_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_affiliate_internal_notes_updated_at
  BEFORE UPDATE ON public.affiliate_internal_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
