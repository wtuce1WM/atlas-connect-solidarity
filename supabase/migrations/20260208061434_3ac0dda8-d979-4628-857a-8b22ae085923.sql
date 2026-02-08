-- Create sponsors table with multilingual support
CREATE TABLE public.sponsors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zone TEXT NOT NULL CHECK (zone IN ('home', 'category', 'city')),
  
  -- French (required)
  name_fr TEXT NOT NULL,
  url_fr TEXT,
  logo_big_url_fr TEXT,
  logo_small_url_fr TEXT,
  image_big_url_fr TEXT,
  image_small_url_fr TEXT,
  
  -- English (optional)
  name_en TEXT,
  url_en TEXT,
  logo_big_url_en TEXT,
  logo_small_url_en TEXT,
  image_big_url_en TEXT,
  image_small_url_en TEXT,
  
  -- Arabic (optional)
  name_ar TEXT,
  url_ar TEXT,
  logo_big_url_ar TEXT,
  logo_small_url_ar TEXT,
  image_big_url_ar TEXT,
  image_small_url_ar TEXT,
  
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;

-- Public read access for active sponsors
CREATE POLICY "Anyone can view active sponsors"
ON public.sponsors
FOR SELECT
USING (is_active = true);

-- Staff can view all sponsors
CREATE POLICY "Staff can view all sponsors"
ON public.sponsors
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

-- Staff can insert sponsors
CREATE POLICY "Staff can insert sponsors"
ON public.sponsors
FOR INSERT
TO authenticated
WITH CHECK (public.is_staff(auth.uid()));

-- Staff can update sponsors
CREATE POLICY "Staff can update sponsors"
ON public.sponsors
FOR UPDATE
TO authenticated
USING (public.is_staff(auth.uid()));

-- Staff can delete sponsors
CREATE POLICY "Staff can delete sponsors"
ON public.sponsors
FOR DELETE
TO authenticated
USING (public.is_staff(auth.uid()));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sponsors_updated_at
BEFORE UPDATE ON public.sponsors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for sponsor assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('sponsor-assets', 'sponsor-assets', true);

-- Storage policies for sponsor assets
CREATE POLICY "Sponsor assets are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'sponsor-assets');

CREATE POLICY "Staff can upload sponsor assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'sponsor-assets' AND public.is_staff(auth.uid()));

CREATE POLICY "Staff can update sponsor assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'sponsor-assets' AND public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete sponsor assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'sponsor-assets' AND public.is_staff(auth.uid()));