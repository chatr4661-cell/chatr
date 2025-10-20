-- Create media_files table for deduplication
CREATE TABLE IF NOT EXISTS public.media_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hash TEXT NOT NULL,
  url TEXT NOT NULL,
  size INTEGER NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(hash, user_id)
);

-- Enable RLS
ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own media files"
  ON public.media_files
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own media files"
  ON public.media_files
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_media_files_hash ON public.media_files(hash, user_id);
CREATE INDEX IF NOT EXISTS idx_media_files_user ON public.media_files(user_id);

-- Create chat-media storage bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;