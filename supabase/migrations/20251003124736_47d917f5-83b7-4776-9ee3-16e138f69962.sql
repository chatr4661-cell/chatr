-- Create storage bucket for provider certificates
INSERT INTO storage.buckets (id, name, public)
VALUES ('provider-certificates', 'provider-certificates', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for provider certificates
CREATE POLICY "Admins can view all certificates"
ON storage.objects FOR SELECT
USING (bucket_id = 'provider-certificates' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can upload certificates"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'provider-certificates' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update certificates"
ON storage.objects FOR UPDATE
USING (bucket_id = 'provider-certificates' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete certificates"
ON storage.objects FOR DELETE
USING (bucket_id = 'provider-certificates' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Providers can view their certificates"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'provider-certificates' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM service_providers WHERE user_id = auth.uid()
  )
);

-- Add document_urls column to service_providers table
ALTER TABLE service_providers ADD COLUMN IF NOT EXISTS document_urls text[];