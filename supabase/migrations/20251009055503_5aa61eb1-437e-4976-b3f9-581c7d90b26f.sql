-- Update handle_new_user trigger to read phone from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Ensure phone number exists in metadata
  IF NEW.raw_user_meta_data->>'phone_number' IS NULL THEN
    RAISE EXCEPTION 'Phone number is required for user registration';
  END IF;
  
  INSERT INTO public.profiles (id, username, avatar_url, email, phone_number, phone_hash, google_id)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      NEW.raw_user_meta_data->>'full_name',
      'User_' || substring(NEW.id::text from 1 for 8)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email,
    NEW.raw_user_meta_data->>'phone_number',
    NEW.raw_user_meta_data->>'phone_hash',
    NEW.raw_user_meta_data->>'provider_id'
  );
  RETURN NEW;
END;
$function$;