-- Fix the generate_sso_token function to work without gen_random_bytes
DROP FUNCTION IF EXISTS public.generate_sso_token(uuid);

CREATE OR REPLACE FUNCTION public.generate_sso_token(app_id_param uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  token_value text;
  user_id_val uuid;
BEGIN
  user_id_val := auth.uid();
  
  IF user_id_val IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Use MD5 hash of random and timestamp for token generation
  token_value := encode(digest(random()::text || clock_timestamp()::text || user_id_val::text, 'sha256'), 'base64');
  
  INSERT INTO sso_tokens (token, user_id, app_id, expires_at)
  VALUES (token_value, user_id_val, app_id_param, now() + interval '5 minutes');
  
  RETURN token_value;
END;
$function$;