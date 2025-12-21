
-- Create optimized RPC function for native app chat list
-- Returns all conversations for the authenticated user with proper user info
CREATE OR REPLACE FUNCTION public.get_user_conversations()
RETURNS TABLE (
  conversation_id UUID,
  is_group BOOLEAN,
  group_name TEXT,
  group_icon_url TEXT,
  other_user_id UUID,
  other_user_name TEXT,
  other_user_avatar TEXT,
  other_user_online BOOLEAN,
  last_message TEXT,
  last_message_type TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_sender_id UUID,
  unread_count BIGINT,
  is_muted BOOLEAN,
  is_archived BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  RETURN QUERY
  WITH user_conversations AS (
    -- Get all conversations the user is part of
    SELECT 
      cp.conversation_id,
      cp.is_muted,
      cp.is_archived,
      cp.last_read_at
    FROM conversation_participants cp
    WHERE cp.user_id = current_user_id
  ),
  last_messages AS (
    -- Get the last message for each conversation
    SELECT DISTINCT ON (m.conversation_id)
      m.conversation_id,
      m.content,
      m.message_type,
      m.created_at,
      m.sender_id
    FROM messages m
    WHERE m.conversation_id IN (SELECT uc.conversation_id FROM user_conversations uc)
      AND m.is_deleted = false
    ORDER BY m.conversation_id, m.created_at DESC
  ),
  unread_counts AS (
    -- Count unread messages per conversation
    SELECT 
      m.conversation_id,
      COUNT(*) as unread
    FROM messages m
    JOIN user_conversations uc ON uc.conversation_id = m.conversation_id
    WHERE m.sender_id != current_user_id
      AND m.is_deleted = false
      AND (uc.last_read_at IS NULL OR m.created_at > uc.last_read_at)
    GROUP BY m.conversation_id
  ),
  other_participants AS (
    -- Get the other user in 1-to-1 conversations
    SELECT DISTINCT ON (cp.conversation_id)
      cp.conversation_id,
      p.id as user_id,
      COALESCE(p.username, p.email, 'User') as username,
      p.avatar_url,
      COALESCE(p.is_online, false) as is_online
    FROM conversation_participants cp
    JOIN profiles p ON p.id = cp.user_id
    JOIN conversations c ON c.id = cp.conversation_id
    WHERE cp.conversation_id IN (SELECT uc.conversation_id FROM user_conversations uc)
      AND cp.user_id != current_user_id
      AND c.is_group = false
    ORDER BY cp.conversation_id, cp.joined_at
  )
  SELECT 
    c.id as conversation_id,
    c.is_group,
    c.group_name,
    c.group_icon_url,
    op.user_id as other_user_id,
    op.username as other_user_name,
    op.avatar_url as other_user_avatar,
    op.is_online as other_user_online,
    lm.content as last_message,
    lm.message_type as last_message_type,
    lm.created_at as last_message_at,
    lm.sender_id as last_message_sender_id,
    COALESCE(uc_counts.unread, 0) as unread_count,
    uc.is_muted,
    uc.is_archived
  FROM user_conversations uc
  JOIN conversations c ON c.id = uc.conversation_id
  LEFT JOIN last_messages lm ON lm.conversation_id = c.id
  LEFT JOIN unread_counts uc_counts ON uc_counts.conversation_id = c.id
  LEFT JOIN other_participants op ON op.conversation_id = c.id
  WHERE uc.is_archived = false
  ORDER BY lm.created_at DESC NULLS LAST;
END;
$$;

-- Create RPC function for chat detail messages
CREATE OR REPLACE FUNCTION public.get_conversation_messages(
  p_conversation_id UUID,
  p_limit INT DEFAULT 50,
  p_before TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  message_id UUID,
  sender_id UUID,
  sender_name TEXT,
  sender_avatar TEXT,
  content TEXT,
  message_type TEXT,
  created_at TIMESTAMPTZ,
  is_edited BOOLEAN,
  is_deleted BOOLEAN,
  is_starred BOOLEAN,
  reply_to_id UUID,
  media_url TEXT,
  media_attachments JSONB,
  reactions JSONB,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Verify user is a participant
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants 
    WHERE conversation_id = p_conversation_id 
    AND user_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'Not a participant in this conversation';
  END IF;
  
  RETURN QUERY
  SELECT 
    m.id as message_id,
    m.sender_id,
    COALESCE(p.username, p.email, 'User') as sender_name,
    p.avatar_url as sender_avatar,
    m.content,
    m.message_type,
    m.created_at,
    m.is_edited,
    m.is_deleted,
    m.is_starred,
    m.reply_to_id,
    m.media_url,
    m.media_attachments,
    m.reactions,
    m.status
  FROM messages m
  LEFT JOIN profiles p ON p.id = m.sender_id
  WHERE m.conversation_id = p_conversation_id
    AND (p_before IS NULL OR m.created_at < p_before)
  ORDER BY m.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_conversations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_conversation_messages(UUID, INT, TIMESTAMPTZ) TO authenticated;
