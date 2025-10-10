-- Fix the optimized function - use proper column naming
DROP FUNCTION IF EXISTS get_user_conversations_optimized(UUID);

CREATE OR REPLACE FUNCTION get_user_conversations_optimized(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  group_name TEXT,
  group_icon_url TEXT,
  is_group BOOLEAN,
  is_community BOOLEAN,
  community_description TEXT,
  lastmessage TEXT,
  lastmessagetime TIMESTAMP WITH TIME ZONE,
  otheruser JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH user_convs AS (
    SELECT cp.conversation_id
    FROM conversation_participants cp
    WHERE cp.user_id = p_user_id
    LIMIT 50
  ),
  last_messages AS (
    SELECT DISTINCT ON (m.conversation_id)
      m.conversation_id,
      m.content,
      m.created_at
    FROM messages m
    WHERE m.conversation_id IN (SELECT conversation_id FROM user_convs)
    ORDER BY m.conversation_id, m.created_at DESC
  ),
  other_users AS (
    SELECT DISTINCT ON (cp.conversation_id)
      cp.conversation_id,
      jsonb_build_object(
        'id', p.id,
        'username', p.username,
        'avatar_url', p.avatar_url,
        'is_online', p.is_online
      ) as user_data
    FROM conversation_participants cp
    JOIN profiles p ON p.id = cp.user_id
    JOIN conversations c ON c.id = cp.conversation_id
    WHERE cp.conversation_id IN (SELECT conversation_id FROM user_convs)
      AND cp.user_id != p_user_id
      AND c.is_group = false
  )
  SELECT 
    c.id,
    c.group_name,
    c.group_icon_url,
    c.is_group,
    c.is_community,
    c.community_description,
    lm.content as lastmessage,
    lm.created_at as lastmessagetime,
    ou.user_data as otheruser
  FROM conversations c
  JOIN user_convs uc ON uc.conversation_id = c.id
  LEFT JOIN last_messages lm ON lm.conversation_id = c.id
  LEFT JOIN other_users ou ON ou.conversation_id = c.id
  ORDER BY lm.created_at DESC NULLS LAST;
END;
$$;