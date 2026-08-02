CREATE TABLE public.business_feature_rights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  has_ai_assistant boolean NOT NULL DEFAULT false,
  has_blog_export boolean NOT NULL DEFAULT false,
  has_nearby_widget boolean NOT NULL DEFAULT false,
  has_dashboard boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_feature_rights TO authenticated;
GRANT ALL ON public.business_feature_rights TO service_role;

ALTER TABLE public.business_feature_rights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage business feature rights"
ON public.business_feature_rights FOR ALL TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Affiliates can view rights of their businesses"
ON public.business_feature_rights FOR SELECT TO authenticated
USING (public.is_own_affiliate_business(auth.uid(), business_id));

CREATE TRIGGER update_business_feature_rights_updated_at
BEFORE UPDATE ON public.business_feature_rights
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();