-- Update handle_new_user to capture Google ID
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;