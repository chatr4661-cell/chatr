-- Create storage bucket for social media posts
INSERT INTO storage.buckets (id, name, public)
VALUES ('social-media', 'social-media', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for social-media bucket
CREATE POLICY "Users can upload their own media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'social-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can view public social media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'social-media');

CREATE POLICY "Users can update their own media"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'social-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'social-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Add mood field to youth_posts if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'youth_posts' AND column_name = 'mood'
  ) THEN
    ALTER TABLE youth_posts ADD COLUMN mood text;
  END IF;
END $$;