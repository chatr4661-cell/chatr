-- Add media_attachments column to messages table for multiple images
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS media_attachments jsonb DEFAULT '[]'::jsonb;

-- Create function to limit group chat participants to 5
CREATE OR REPLACE FUNCTION check_participant_limit()
RETURNS TRIGGER AS $$
DECLARE
  participant_count INTEGER;
  is_group_chat BOOLEAN;
BEGIN
  -- Check if this is a group chat
  SELECT is_group INTO is_group_chat
  FROM conversations
  WHERE id = NEW.conversation_id;
  
  -- Only enforce limit for group chats
  IF is_group_chat THEN
    SELECT COUNT(*) INTO participant_count
    FROM conversation_participants
    WHERE conversation_id = NEW.conversation_id;
    
    IF participant_count >= 5 THEN
      RAISE EXCEPTION 'Group chat cannot have more than 5 participants';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce participant limit
DROP TRIGGER IF EXISTS limit_group_participants ON conversation_participants;
CREATE TRIGGER limit_group_participants
  BEFORE INSERT ON conversation_participants
  FOR EACH ROW
  EXECUTE FUNCTION check_participant_limit();

-- Add index for better performance on media attachments queries
CREATE INDEX IF NOT EXISTS idx_messages_media_attachments ON messages USING GIN (media_attachments);

-- Add index for conversation participants lookups
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON conversation_participants(user_id);