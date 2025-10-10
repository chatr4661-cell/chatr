-- Create stories storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stories',
  'stories',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
);

-- Create storage policies for stories bucket
CREATE POLICY "Users can upload their own stories"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'stories' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Stories are publicly viewable"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'stories');

CREATE POLICY "Users can update their own stories"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'stories' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own stories"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'stories' AND
  (storage.foldername(name))[1] = auth.uid()::text
);