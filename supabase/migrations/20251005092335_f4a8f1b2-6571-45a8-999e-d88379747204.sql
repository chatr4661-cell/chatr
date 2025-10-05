-- Add message status and reactions columns
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMP WITH TIME ZONE;

-- Create typing_indicators table for real-time typing status
CREATE TABLE IF NOT EXISTS typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL,
  is_typing BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- Policies for typing indicators
CREATE POLICY "Users can view typing indicators in their conversations"
  ON typing_indicators FOR SELECT
  USING (
    conversation_id IN (
      SELECT DISTINCT conversation_id 
      FROM messages 
      WHERE sender_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own typing status"
  ON typing_indicators FOR ALL
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_typing_indicators_conversation 
  ON typing_indicators(conversation_id, user_id);

CREATE INDEX IF NOT EXISTS idx_messages_scheduled 
  ON messages(scheduled_for) WHERE scheduled_for IS NOT NULL;