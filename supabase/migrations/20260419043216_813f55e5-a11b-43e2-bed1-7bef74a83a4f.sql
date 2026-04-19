CREATE TABLE public.business_image_titles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (business_id, image_url)
);

ALTER TABLE public.business_image_titles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Image titles are publicly readable"
ON public.business_image_titles
FOR SELECT
USING (true);

CREATE POLICY "Staff can insert image titles"
ON public.business_image_titles
FOR INSERT
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update image titles"
ON public.business_image_titles
FOR UPDATE
USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete image titles"
ON public.business_image_titles
FOR DELETE
USING (public.is_staff(auth.uid()));

CREATE POLICY "Affiliate owners can insert image titles for their businesses"
ON public.business_image_titles
FOR INSERT
WITH CHECK (public.is_own_affiliate_business(auth.uid(), business_id));

CREATE POLICY "Affiliate owners can update image titles for their businesses"
ON public.business_image_titles
FOR UPDATE
USING (public.is_own_affiliate_business(auth.uid(), business_id));

CREATE POLICY "Affiliate owners can delete image titles for their businesses"
ON public.business_image_titles
FOR DELETE
USING (public.is_own_affiliate_business(auth.uid(), business_id));

CREATE INDEX idx_business_image_titles_business_id ON public.business_image_titles(business_id);

CREATE TRIGGER update_business_image_titles_updated_at
BEFORE UPDATE ON public.business_image_titles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();