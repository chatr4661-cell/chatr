-- Add media_url column to messages table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'messages' 
    AND column_name = 'media_url'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN media_url TEXT;
  END IF;
END $$;