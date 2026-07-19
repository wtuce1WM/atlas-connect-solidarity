
-- 1. Entitlement flag on affiliates
ALTER TABLE public.affiliates
  ADD COLUMN IF NOT EXISTS has_showcase_site boolean NOT NULL DEFAULT false;

-- 2. Showcase site table
CREATE TABLE public.business_showcase_site (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  canonical_url text,
  custom_domain text,
  tagline_fr text,
  tagline_en text,
  tagline_ar text,
  hero_video_url text,
  hero_image_url text,
  story_fr text,
  story_en text,
  story_ar text,
  testimonials jsonb NOT NULL DEFAULT '[]'::jsonb,
  cta_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  theme jsonb NOT NULL DEFAULT '{}'::jsonb,
  gallery_image_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Grants
GRANT SELECT ON public.business_showcase_site TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_showcase_site TO authenticated;
GRANT ALL ON public.business_showcase_site TO service_role;

-- 4. RLS
ALTER TABLE public.business_showcase_site ENABLE ROW LEVEL SECURITY;

-- Public read only when enabled
CREATE POLICY "Public can read enabled showcase sites"
  ON public.business_showcase_site
  FOR SELECT
  TO anon, authenticated
  USING (enabled = true);

-- Staff full access
CREATE POLICY "Staff can manage all showcase sites"
  ON public.business_showcase_site
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'staff'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'staff'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

-- Affiliates: read their own businesses
CREATE POLICY "Affiliates can read their showcase sites"
  ON public.business_showcase_site
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      JOIN public.affiliates a ON a.id = b.affiliate_id
      WHERE b.id = business_showcase_site.business_id
        AND a.user_id = auth.uid()
    )
  );

-- Affiliates: insert on their own businesses
CREATE POLICY "Affiliates can insert their showcase sites"
  ON public.business_showcase_site
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses b
      JOIN public.affiliates a ON a.id = b.affiliate_id
      WHERE b.id = business_showcase_site.business_id
        AND a.user_id = auth.uid()
        AND a.has_showcase_site = true
    )
  );

-- Affiliates: update their own
CREATE POLICY "Affiliates can update their showcase sites"
  ON public.business_showcase_site
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      JOIN public.affiliates a ON a.id = b.affiliate_id
      WHERE b.id = business_showcase_site.business_id
        AND a.user_id = auth.uid()
        AND a.has_showcase_site = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses b
      JOIN public.affiliates a ON a.id = b.affiliate_id
      WHERE b.id = business_showcase_site.business_id
        AND a.user_id = auth.uid()
        AND a.has_showcase_site = true
    )
  );

-- 5. updated_at trigger
CREATE TRIGGER update_business_showcase_site_updated_at
  BEFORE UPDATE ON public.business_showcase_site
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Index on custom_domain for reverse-proxy lookups
CREATE INDEX IF NOT EXISTS idx_business_showcase_custom_domain
  ON public.business_showcase_site(custom_domain)
  WHERE custom_domain IS NOT NULL;
