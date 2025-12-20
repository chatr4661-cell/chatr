-- Add privacy_settings column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{}';

-- Add index for reactions on messages
CREATE INDEX IF NOT EXISTS idx_messages_reactions ON public.messages USING GIN(reactions);

-- Create a function to update message reactions
CREATE OR REPLACE FUNCTION public.toggle_message_reaction(
  p_message_id UUID,
  p_user_id UUID,
  p_emoji TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reactions JSONB;
  v_new_reactions JSONB;
  v_reaction JSONB;
  v_found BOOLEAN := FALSE;
BEGIN
  -- Get current reactions
  SELECT COALESCE(reactions, '[]'::jsonb) INTO v_reactions
  FROM messages
  WHERE id = p_message_id;

  -- Check if user already reacted with this emoji
  v_new_reactions := '[]'::jsonb;
  
  FOR v_reaction IN SELECT * FROM jsonb_array_elements(v_reactions)
  LOOP
    IF v_reaction->>'user_id' = p_user_id::TEXT AND v_reaction->>'emoji' = p_emoji THEN
      v_found := TRUE;
      -- Skip this reaction (remove it)
    ELSE
      v_new_reactions := v_new_reactions || v_reaction;
    END IF;
  END LOOP;

  -- If not found, add the reaction
  IF NOT v_found THEN
    v_new_reactions := v_new_reactions || jsonb_build_object(
      'emoji', p_emoji,
      'user_id', p_user_id,
      'created_at', NOW()
    );
  END IF;

  -- Update the message
  UPDATE messages
  SET reactions = v_new_reactions
  WHERE id = p_message_id;

  RETURN v_new_reactions;
END;
$$;