-- Fix RLS policies for social-media bucket to allow authenticated users to upload

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to upload social media" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to read social media" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own uploads" ON storage.objects;

-- Create policy for authenticated users to upload to social-media bucket
CREATE POLICY "Allow authenticated users to upload social media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'social-media');

-- Allow anyone to read from social-media bucket (since it's public)
CREATE POLICY "Allow public to read social media"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'social-media');

-- Allow users to update their own files
CREATE POLICY "Allow users to update their own uploads"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'social-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own files
CREATE POLICY "Allow users to delete their own uploads"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'social-media' AND auth.uid()::text = (storage.foldername(name))[1]);