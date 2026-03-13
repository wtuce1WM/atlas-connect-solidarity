
CREATE TABLE public.business_social_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'pinterest')),
  post_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.business_social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Social posts are viewable by everyone"
  ON public.business_social_posts FOR SELECT
  TO public USING (true);

CREATE POLICY "Staff can insert social posts"
  ON public.business_social_posts FOR INSERT
  TO public WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update social posts"
  ON public.business_social_posts FOR UPDATE
  TO public USING (is_staff(auth.uid()));

CREATE POLICY "Staff can delete social posts"
  ON public.business_social_posts FOR DELETE
  TO public USING (is_staff(auth.uid()));
