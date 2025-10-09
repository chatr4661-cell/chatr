-- Function to add participant to existing call
CREATE OR REPLACE FUNCTION add_call_participant(
  p_call_id UUID,
  p_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update calls table to mark as group call
  UPDATE calls 
  SET is_group = true
  WHERE id = p_call_id;
  
  -- Insert into call_participants
  INSERT INTO call_participants (call_id, user_id, audio_enabled, video_enabled, is_active)
  VALUES (p_call_id, p_user_id, true, true, true)
  ON CONFLICT (call_id, user_id) DO NOTHING;
END;
$$;

-- Function to get active call participants with details
CREATE OR REPLACE FUNCTION get_call_participants(p_call_id UUID)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  audio_enabled BOOLEAN,
  video_enabled BOOLEAN,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.user_id,
    p.username,
    p.avatar_url,
    cp.audio_enabled,
    cp.video_enabled,
    cp.is_active
  FROM call_participants cp
  JOIN profiles p ON p.id = cp.user_id
  WHERE cp.call_id = p_call_id
  AND cp.is_active = true;
END;
$$;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_call_participants_call_id ON call_participants(call_id) WHERE is_active = true;