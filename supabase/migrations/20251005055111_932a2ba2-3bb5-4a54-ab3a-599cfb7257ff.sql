-- Update conversations table to support group chats better
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS admin_id uuid REFERENCES auth.users(id);

-- Create message_forwards table to track forwarded messages
CREATE TABLE IF NOT EXISTS message_forwards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  forwarded_message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  forwarded_by uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on message_forwards
ALTER TABLE message_forwards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view message forwards in their conversations"
  ON message_forwards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_forwards.forwarded_message_id 
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create message forwards"
  ON message_forwards FOR INSERT
  WITH CHECK (auth.uid() = forwarded_by);

-- Update conversation_participants to support admin roles
ALTER TABLE conversation_participants
DROP CONSTRAINT IF EXISTS conversation_participants_role_check;

ALTER TABLE conversation_participants
ADD CONSTRAINT conversation_participants_role_check 
CHECK (role IN ('member', 'admin', 'creator'));

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_message_forwards_original ON message_forwards(original_message_id);
CREATE INDEX IF NOT EXISTS idx_message_forwards_forwarded ON message_forwards(forwarded_message_id);