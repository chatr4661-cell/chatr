
-- Add user language preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'en';

-- Create a table to cache translations for better performance
CREATE TABLE IF NOT EXISTS message_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  original_language VARCHAR(10) NOT NULL,
  target_language VARCHAR(10) NOT NULL,
  translated_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(message_id, target_language)
);

-- Enable RLS
ALTER TABLE message_translations ENABLE ROW LEVEL SECURITY;

-- Allow users to read translations for messages they can see
CREATE POLICY "Users can read translations for accessible messages"
ON message_translations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = message_translations.message_id
    AND cp.user_id = auth.uid()
  )
);

-- Allow system to insert translations
CREATE POLICY "System can insert translations"
ON message_translations FOR INSERT
WITH CHECK (true);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_message_translations_lookup 
ON message_translations(message_id, target_language);
