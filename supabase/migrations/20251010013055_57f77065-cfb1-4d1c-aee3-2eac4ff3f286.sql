-- E2E Encryption and Cloud Backup Tables

-- Chat backups storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-backups', 'chat-backups', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for chat-backups bucket
CREATE POLICY "Users can upload their own backups"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-backups' 
  AND (storage.foldername(name))[1] = 'backups'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users can read their own backups"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-backups'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users can delete their own backups"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-backups'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Backup history tracking
CREATE TABLE IF NOT EXISTS backup_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  backup_key text NOT NULL,
  message_count integer DEFAULT 0,
  size_bytes bigint,
  includes_media boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_backup_user ON backup_history(user_id, created_at DESC);

ALTER TABLE backup_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their backup history"
ON backup_history FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create backup records"
ON backup_history FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their backup records"
ON backup_history FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Auto-backup settings
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS auto_backup_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_backup_frequency text DEFAULT 'weekly', -- 'daily', 'weekly', 'monthly'
ADD COLUMN IF NOT EXISTS last_backup_at timestamptz;
