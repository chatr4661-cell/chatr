-- First, update any profiles without phone numbers to have a placeholder
-- This ensures we can make the column NOT NULL
UPDATE profiles 
SET phone_number = COALESCE(phone_number, '+000' || id::text)
WHERE phone_number IS NULL;

-- Now make phone_number required and unique
ALTER TABLE profiles 
  ALTER COLUMN phone_number SET NOT NULL;

-- Add unique constraint
ALTER TABLE profiles 
  ADD CONSTRAINT profiles_phone_number_unique UNIQUE (phone_number);

-- Add indexes for faster phone number lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON profiles(phone_number);
CREATE INDEX IF NOT EXISTS idx_profiles_phone_search ON profiles(phone_search);

-- Update the handle_new_user function to ensure phone is always set
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure phone number exists
  IF NEW.phone IS NULL THEN
    RAISE EXCEPTION 'Phone number is required for user registration';
  END IF;
  
  INSERT INTO public.profiles (id, username, avatar_url, email, phone_number, google_id)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.phone, '@', 1),
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