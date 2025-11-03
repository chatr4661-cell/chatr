-- Revert chat-media bucket to public to fix media uploads
-- The MediaLightbox will still work for in-app viewing

-- Make bucket public again
UPDATE storage.buckets 
SET public = true 
WHERE id = 'chat-media';

-- Re-enable public SELECT policy for chat-media
DROP POLICY IF EXISTS "Authenticated users can view chat media" ON storage.objects;

CREATE POLICY "Public read access for chat media"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-media');