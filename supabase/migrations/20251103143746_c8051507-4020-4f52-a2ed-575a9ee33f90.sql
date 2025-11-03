-- Enable RLS policies for chat-media storage bucket

-- Allow authenticated users to upload their own chat media
CREATE POLICY "Users can upload their own chat media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-media' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow anyone to view chat media (public bucket)
CREATE POLICY "Anyone can view chat media"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'chat-media');

-- Allow users to update their own chat media
CREATE POLICY "Users can update their own chat media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'chat-media' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own chat media
CREATE POLICY "Users can delete their own chat media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-media' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);