-- Update chat-media bucket to be private
UPDATE storage.buckets
SET public = false
WHERE id = 'chat-media';

-- Remove public SELECT policy
DROP POLICY IF EXISTS "Anyone can view chat media" ON storage.objects;

-- Add authenticated-only SELECT policy with signed URLs
CREATE POLICY "Authenticated users can view chat media with signed URLs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat-media');