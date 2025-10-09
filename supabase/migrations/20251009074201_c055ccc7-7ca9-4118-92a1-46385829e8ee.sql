-- Fix the existing user without profile
DO $$
DECLARE
  user_id UUID := 'fbe7641c-bcc0-4fb4-af87-b94e915c2936';
  user_phone TEXT := '+919717845477';
BEGIN
  -- Create profile for existing user
  INSERT INTO profiles (id, phone_number, username)
  VALUES (user_id, user_phone, 'User_5477')
  ON CONFLICT (id) DO UPDATE 
  SET phone_number = user_phone;
  
  -- Update auth user with phone number
  UPDATE auth.users 
  SET phone = user_phone, 
      phone_confirmed_at = NOW(),
      raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{phone}',
        to_jsonb(user_phone)
      )
  WHERE id = user_id;
  
  RAISE NOTICE 'Fixed user profile and phone for: %', user_id;
END $$;

-- Clean up old verified OTPs
DELETE FROM otp_verifications 
WHERE verified = true 
AND created_at < NOW() - INTERVAL '1 hour';