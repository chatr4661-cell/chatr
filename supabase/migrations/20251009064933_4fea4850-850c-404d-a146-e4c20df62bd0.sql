-- Update handle_new_user to work with real phone auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- For phone auth, phone is in NEW.phone, not metadata
  -- For email/Google auth, phone might be in metadata
  INSERT INTO public.profiles (
    id, 
    username, 
    avatar_url, 
    email, 
    phone_number, 
    google_id
  )
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      NEW.raw_user_meta_data->>'full_name',
      'User_' || substring(NEW.id::text from 1 for 8)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email,
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone_number'),
    NEW.raw_user_meta_data->>'provider_id'
  );
  RETURN NEW;
END;
$$;