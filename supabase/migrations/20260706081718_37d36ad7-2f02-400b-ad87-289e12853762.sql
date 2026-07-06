-- Allow authenticated users to upload files to chat_attachments
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat_attachments');

-- Allow authenticated users to view files in chat_attachments
CREATE POLICY "Allow authenticated reads"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat_attachments');