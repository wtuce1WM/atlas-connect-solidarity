-- 1) Staff-only internal notes for quotes
CREATE TABLE public.quote_internal_notes (
  quote_id uuid PRIMARY KEY REFERENCES public.quotes(id) ON DELETE CASCADE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_internal_notes TO authenticated;
GRANT ALL ON public.quote_internal_notes TO service_role;

ALTER TABLE public.quote_internal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage quote internal notes"
ON public.quote_internal_notes
FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER quote_internal_notes_set_updated_at
BEFORE UPDATE ON public.quote_internal_notes
FOR EACH ROW EXECUTE FUNCTION public.billing_set_updated_at();

INSERT INTO public.quote_internal_notes (quote_id, notes)
SELECT id, internal_notes FROM public.quotes WHERE internal_notes IS NOT NULL;

ALTER TABLE public.quotes DROP COLUMN internal_notes;

-- 2) Fix affiliate legal storage policy (folder = affiliate id)
DROP POLICY IF EXISTS "Affiliates manage own legal files" ON storage.objects;

CREATE POLICY "Affiliates manage own legal files"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'affiliate-legal'
  AND EXISTS (
    SELECT 1 FROM public.affiliates a
    WHERE a.user_id = auth.uid()
      AND (storage.foldername(storage.objects.name))[1] = a.id::text
  )
)
WITH CHECK (
  bucket_id = 'affiliate-legal'
  AND EXISTS (
    SELECT 1 FROM public.affiliates a
    WHERE a.user_id = auth.uid()
      AND (storage.foldername(storage.objects.name))[1] = a.id::text
  )
);