-- Fix get_user_conversations_optimized to include full_name, phone_number, last_seen, unread_count
-- This makes the chat list show real names (like WhatsApp) instead of just usernames/phone numbers

DROP FUNCTION IF EXISTS public.get_user_conversations_optimized(uuid);

CREATE OR REPLACE FUNCTION public.get_user_conversations_optimized(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  group_name text,
  group_icon_url text,
  is_group boolean,
  is_community boolean,
  community_description text,
  lastmessage text,
  lastmessagetime timestamp with time zone,
  otheruser jsonb,
  unread_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  WITH user_convs AS (
    SELECT cp.conversation_id
    FROM conversation_participants cp
    WHERE cp.user_id = p_user_id
    LIMIT 100
  ),
  last_messages AS (
    SELECT DISTINCT ON (m.conversation_id)
      m.conversation_id,
      m.content,
      m.created_at,
      m.sender_id
    FROM messages m
    WHERE m.conversation_id IN (SELECT conversation_id FROM user_convs)
      AND (m.is_deleted IS NULL OR m.is_deleted = false)
    ORDER BY m.conversation_id, m.created_at DESC
  ),
  other_users AS (
    SELECT DISTINCT ON (cp.conversation_id)
      cp.conversation_id,
      jsonb_build_object(
        'id', p.id,
        'username', p.username,
        'full_name', p.full_name,
        'avatar_url', p.avatar_url,
        'is_online', p.is_online,
        'phone_number', p.phone_number,
        'last_seen', p.last_seen
      ) as user_data
    FROM conversation_participants cp
    JOIN profiles p ON p.id = cp.user_id
    JOIN conversations c ON c.id = cp.conversation_id
    WHERE cp.conversation_id IN (SELECT conversation_id FROM user_convs)
      AND cp.user_id != p_user_id
      AND c.is_group = false
    ORDER BY cp.conversation_id
  ),
  unread_counts AS (
    SELECT
      m.conversation_id,
      COUNT(*) as cnt
    FROM messages m
    WHERE m.conversation_id IN (SELECT conversation_id FROM user_convs)
      AND m.sender_id != p_user_id
      AND (m.is_deleted IS NULL OR m.is_deleted = false)
      AND NOT EXISTS (
        SELECT 1 FROM message_reads mr
        WHERE mr.message_id = m.id AND mr.user_id = p_user_id
      )
    GROUP BY m.conversation_id
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
    COALESCE(ou.user_data, NULL) as otheruser,
    COALESCE(uc2.cnt, 0) as unread_count
  FROM conversations c
  JOIN user_convs uc ON uc.conversation_id = c.id
  LEFT JOIN last_messages lm ON lm.conversation_id = c.id
  LEFT JOIN other_users ou ON ou.conversation_id = c.id
  LEFT JOIN unread_counts uc2 ON uc2.conversation_id = c.id
  ORDER BY lm.created_at DESC NULLS LAST;
END;
$function$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_conversations_optimized(uuid) TO authenticated;
