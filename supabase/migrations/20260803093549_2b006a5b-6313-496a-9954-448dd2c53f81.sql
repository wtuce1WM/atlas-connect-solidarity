CREATE TABLE public.business_embed_ai_item_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  item_kind text NOT NULL CHECK (item_kind IN ('suggestion','followup')),
  item_id uuid NOT NULL,
  blog_post_ids uuid[] NOT NULL DEFAULT '{}',
  ai_text_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, item_kind, item_id)
);

GRANT SELECT ON public.business_embed_ai_item_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_embed_ai_item_links TO authenticated;
GRANT ALL ON public.business_embed_ai_item_links TO service_role;

ALTER TABLE public.business_embed_ai_item_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read embed ai item links"
ON public.business_embed_ai_item_links FOR SELECT
USING (true);

CREATE POLICY "Staff can manage embed ai item links"
ON public.business_embed_ai_item_links FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Affiliates can manage own embed ai item links"
ON public.business_embed_ai_item_links FOR ALL
TO authenticated
USING (public.is_own_affiliate_business(auth.uid(), business_id))
WITH CHECK (public.is_own_affiliate_business(auth.uid(), business_id));

CREATE TRIGGER update_business_embed_ai_item_links_updated_at
BEFORE UPDATE ON public.business_embed_ai_item_links
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_beail_business ON public.business_embed_ai_item_links(business_id);