-- Create a helper function to create 1-on-1 conversations with both participants
CREATE OR REPLACE FUNCTION public.create_direct_conversation(
  other_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_conv_id UUID;
  new_conv_id UUID;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF current_user_id = other_user_id THEN
    RAISE EXCEPTION 'Cannot create conversation with yourself';
  END IF;
  
  -- Check if a 1-on-1 conversation already exists between these users
  existing_conv_id := public.find_shared_conversation(current_user_id, other_user_id);
  
  IF existing_conv_id IS NOT NULL THEN
    RETURN existing_conv_id;
  END IF;
  
  -- Create new conversation
  INSERT INTO conversations (created_by, is_group)
  VALUES (current_user_id, false)
  RETURNING id INTO new_conv_id;
  
  -- Add both participants
  INSERT INTO conversation_participants (conversation_id, user_id, role)
  VALUES 
    (new_conv_id, current_user_id, 'member'),
    (new_conv_id, other_user_id, 'member');
  
  RETURN new_conv_id;
END;
$$;