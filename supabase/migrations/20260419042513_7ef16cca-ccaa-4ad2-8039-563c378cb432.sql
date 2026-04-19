CREATE TABLE public.business_image_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, image_url, badge_id)
);

CREATE INDEX idx_business_image_badges_business ON public.business_image_badges(business_id);
CREATE INDEX idx_business_image_badges_badge ON public.business_image_badges(badge_id);

ALTER TABLE public.business_image_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view image badges"
  ON public.business_image_badges FOR SELECT USING (true);

CREATE POLICY "Staff can manage image badges"
  ON public.business_image_badges FOR ALL
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Affiliates can manage their image badges"
  ON public.business_image_badges FOR ALL
  USING (public.is_own_affiliate_business(auth.uid(), business_id))
  WITH CHECK (public.is_own_affiliate_business(auth.uid(), business_id));