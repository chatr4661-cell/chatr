-- Add critical indexes for faster chat queries

-- Index for faster message loading by conversation
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON public.messages(conversation_id, created_at DESC);

-- Index for unread message counts
CREATE INDEX IF NOT EXISTS idx_messages_unread 
ON public.messages(conversation_id, sender_id, read_at) 
WHERE read_at IS NULL;

-- Index for conversation participants lookup
CREATE INDEX IF NOT EXISTS idx_conv_participants_user 
ON public.conversation_participants(user_id, conversation_id);

-- Index for faster profile lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone_hash 
ON public.profiles(phone_hash) WHERE phone_hash IS NOT NULL;

-- Index for contacts by user
CREATE INDEX IF NOT EXISTS idx_contacts_user_registered 
ON public.contacts(user_id, is_registered) WHERE is_registered = true;

-- Partial index for online users
CREATE INDEX IF NOT EXISTS idx_profiles_online 
ON public.profiles(is_online) WHERE is_online = true;