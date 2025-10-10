-- Add critical indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_sender 
ON messages(sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_user 
ON conversation_participants(user_id, conversation_id);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_conv 
ON conversation_participants(conversation_id, user_id);

CREATE INDEX IF NOT EXISTS idx_profiles_username 
ON profiles(username);

-- Add index for faster contact lookups
CREATE INDEX IF NOT EXISTS idx_contacts_user_registered 
ON contacts(user_id, is_registered) WHERE is_registered = true;