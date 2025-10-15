-- Fix security warning: Add search_path to check_participant_limit function
CREATE OR REPLACE FUNCTION check_participant_limit()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;