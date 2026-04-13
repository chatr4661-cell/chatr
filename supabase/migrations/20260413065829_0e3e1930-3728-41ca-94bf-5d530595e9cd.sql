CREATE OR REPLACE FUNCTION public.check_participant_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  participant_count INTEGER;
  is_group_chat BOOLEAN;
BEGIN
  SELECT is_group INTO is_group_chat
  FROM conversations
  WHERE id = NEW.conversation_id;
  
  IF is_group_chat THEN
    SELECT COUNT(*) INTO participant_count
    FROM conversation_participants
    WHERE conversation_id = NEW.conversation_id;
    
    IF participant_count >= 256 THEN
      RAISE EXCEPTION 'Group chat cannot have more than 256 participants';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;