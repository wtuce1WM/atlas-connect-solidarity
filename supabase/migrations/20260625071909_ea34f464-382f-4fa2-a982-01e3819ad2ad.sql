-- Create SELECT policy for studio-videos bucket
CREATE POLICY "Public can view studio videos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'studio-videos');

-- Create INSERT policy for studio-videos bucket (allows the worker using anon/authenticated/public keys)
CREATE POLICY "Anyone can upload studio videos"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'studio-videos');

-- Create UPDATE policy for studio-videos bucket (to allow overwriting if needed)
CREATE POLICY "Anyone can update studio videos"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'studio-videos')
WITH CHECK (bucket_id = 'studio-videos');

-- Create DELETE policy for studio-videos bucket
CREATE POLICY "Anyone can delete studio videos"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'studio-videos');
