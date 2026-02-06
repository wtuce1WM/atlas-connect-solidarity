-- Add images array column to businesses table
ALTER TABLE public.businesses ADD COLUMN images text[] DEFAULT '{}';

-- Create storage bucket for business images
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-images', 'business-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to business images
CREATE POLICY "Business images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'business-images');

-- Allow authenticated staff to upload images
CREATE POLICY "Staff can upload business images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'business-images' AND auth.role() = 'authenticated');

-- Allow authenticated staff to update images
CREATE POLICY "Staff can update business images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'business-images' AND auth.role() = 'authenticated');

-- Allow authenticated staff to delete images
CREATE POLICY "Staff can delete business images"
ON storage.objects FOR DELETE
USING (bucket_id = 'business-images' AND auth.role() = 'authenticated');