-- Create a function to find shared 1-on-1 conversations between two users
CREATE OR REPLACE FUNCTION find_shared_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  shared_conv_id UUID;
BEGIN
  -- Find a 1-on-1 conversation that has exactly these two users
  SELECT c.id INTO shared_conv_id
  FROM conversations c
  WHERE c.is_group = false
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp1
      WHERE cp1.conversation_id = c.id AND cp1.user_id = user1_id
    )
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp2
      WHERE cp2.conversation_id = c.id AND cp2.user_id = user2_id
    )
    -- Make sure there are exactly 2 participants (no one else)
    AND (
      SELECT COUNT(*) FROM conversation_participants cp
      WHERE cp.conversation_id = c.id
    ) = 2
  ORDER BY c.created_at DESC
  LIMIT 1;
  
  RETURN shared_conv_id;
END;
$$;