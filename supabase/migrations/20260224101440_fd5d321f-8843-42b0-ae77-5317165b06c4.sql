-- Create a storage bucket for business videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('business-videos', 'business-videos', true, 104857600, ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/mpeg']);

-- Public read access
CREATE POLICY "Business videos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'business-videos');

-- Staff can upload videos
CREATE POLICY "Staff can upload business videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'business-videos' AND public.is_staff(auth.uid()));

-- Staff can update videos
CREATE POLICY "Staff can update business videos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'business-videos' AND public.is_staff(auth.uid()));

-- Staff can delete videos
CREATE POLICY "Staff can delete business videos"
ON storage.objects FOR DELETE
USING (bucket_id = 'business-videos' AND public.is_staff(auth.uid()));