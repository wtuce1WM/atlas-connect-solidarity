CREATE TABLE public.business_published_widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  widget_key text NOT NULL,
  format text NOT NULL DEFAULT 'inline',
  target_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, widget_key)
);

GRANT SELECT ON public.business_published_widgets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_published_widgets TO authenticated;
GRANT ALL ON public.business_published_widgets TO service_role;

ALTER TABLE public.business_published_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published widgets are viewable by everyone"
ON public.business_published_widgets FOR SELECT USING (true);

CREATE POLICY "Staff can manage published widgets"
ON public.business_published_widgets FOR ALL TO authenticated
USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Affiliates can manage their own published widgets"
ON public.business_published_widgets FOR ALL TO authenticated
USING (public.is_own_affiliate_business(auth.uid(), business_id))
WITH CHECK (public.is_own_affiliate_business(auth.uid(), business_id));

CREATE TRIGGER set_business_published_widgets_updated_at
BEFORE UPDATE ON public.business_published_widgets
FOR EACH ROW EXECUTE FUNCTION public.billing_set_updated_at();