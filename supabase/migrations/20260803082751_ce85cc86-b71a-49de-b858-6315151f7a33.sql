CREATE TABLE public.business_embed_ai_prefs (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  enabled_suggestion_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  enabled_followup_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.business_embed_ai_prefs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_embed_ai_prefs TO authenticated;
GRANT ALL ON public.business_embed_ai_prefs TO service_role;

ALTER TABLE public.business_embed_ai_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read embed ai prefs"
ON public.business_embed_ai_prefs FOR SELECT
USING (true);

CREATE POLICY "Staff can manage embed ai prefs"
ON public.business_embed_ai_prefs FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Affiliates manage own business embed ai prefs"
ON public.business_embed_ai_prefs FOR ALL
TO authenticated
USING (public.is_own_affiliate_business(auth.uid(), business_id))
WITH CHECK (public.is_own_affiliate_business(auth.uid(), business_id));

CREATE TRIGGER trg_business_embed_ai_prefs_updated
BEFORE UPDATE ON public.business_embed_ai_prefs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();