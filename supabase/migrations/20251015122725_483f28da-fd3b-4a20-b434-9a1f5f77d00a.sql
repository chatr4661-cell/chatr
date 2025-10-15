-- Fix remaining SECURITY DEFINER functions without search_path

-- Function 1: find_emotion_matches
CREATE OR REPLACE FUNCTION public.find_emotion_matches(p_user_id uuid, p_emotion character varying)
RETURNS TABLE(match_user_id uuid, username text, avatar_url text, emotion character varying, intensity integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ec.user_id,
    p.username,
    p.avatar_url,
    ec.current_emotion,
    ec.intensity
  FROM emotion_circles ec
  JOIN profiles p ON p.id = ec.user_id
  WHERE ec.current_emotion = p_emotion
    AND ec.user_id != p_user_id
    AND ec.looking_for_connection = true
    AND ec.active_until > now()
  ORDER BY ec.created_at DESC
  LIMIT 10;
END;
$function$;

-- Function 2: generate_sso_token
CREATE OR REPLACE FUNCTION public.generate_sso_token(app_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  token_value text;
  user_id_val uuid;
BEGIN
  user_id_val := auth.uid();
  
  IF user_id_val IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  token_value := encode(gen_random_bytes(32), 'base64');
  
  INSERT INTO sso_tokens (token, user_id, app_id, expires_at)
  VALUES (token_value, user_id_val, app_id_param, now() + interval '5 minutes');
  
  RETURN token_value;
END;
$function$;

-- Function 3: update_last_seen
CREATE OR REPLACE FUNCTION public.update_last_seen()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE profiles SET last_seen = now(), is_online = true WHERE id = auth.uid();
  RETURN NEW;
END;
$function$;