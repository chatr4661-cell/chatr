-- Enable pgcrypto extension for gen_random_bytes
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS generate_sso_token(uuid);

-- Create function to generate SSO token
CREATE OR REPLACE FUNCTION generate_sso_token(app_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  token_value text;
  user_id_val uuid;
BEGIN
  -- Get current user ID
  user_id_val := auth.uid();
  
  IF user_id_val IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Generate random token
  token_value := encode(gen_random_bytes(32), 'base64');
  
  -- Insert token into sso_tokens table
  INSERT INTO sso_tokens (token, user_id, app_id, expires_at)
  VALUES (token_value, user_id_val, app_id_param, now() + interval '5 minutes');
  
  RETURN token_value;
END;
$$;