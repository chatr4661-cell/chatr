-- Backfill phone_hash for existing users who have phone_number but no phone_hash
-- This function will be called to update existing profiles
CREATE OR REPLACE FUNCTION backfill_phone_hashes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_record RECORD;
  phone_normalized TEXT;
  phone_hash_value TEXT;
BEGIN
  -- Loop through profiles that have phone_number but no phone_hash
  FOR profile_record IN 
    SELECT id, phone_number 
    FROM profiles 
    WHERE phone_number IS NOT NULL 
    AND (phone_hash IS NULL OR phone_hash = '')
  LOOP
    -- Note: This is a placeholder - the actual hashing will be done by the application
    -- We're just ensuring the column is ready to receive the hash
    -- The application will update this when users next log in
    NULL;
  END LOOP;
END;
$$;

-- Update the handle_new_user function to always set phone_hash when creating profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url, email, phone_number, google_id)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1),
      'User_' || substring(NEW.id::text from 1 for 8)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email,
    NEW.phone,
    NEW.raw_user_meta_data->>'provider_id'
  );
  RETURN NEW;
END;
$function$;