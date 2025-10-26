-- First, let's check and fix the handle_new_user trigger
-- The error suggests the trigger is failing to insert into profiles

-- Drop and recreate the trigger function with better error handling
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Insert profile with all necessary fields
  INSERT INTO public.profiles (
    id, 
    username, 
    avatar_url, 
    email, 
    phone_number,
    onboarding_completed
  )
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'phone_number',
      'User_' || substring(NEW.id::text from 1 for 8)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email,
    COALESCE(
      NEW.phone,
      NEW.raw_user_meta_data->>'phone_number'
    ),
    false  -- Default onboarding to not completed
  )
  ON CONFLICT (id) DO UPDATE SET
    phone_number = COALESCE(
      EXCLUDED.phone_number,
      profiles.phone_number
    ),
    email = COALESCE(EXCLUDED.email, profiles.email),
    updated_at = now();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Also ensure award_welcome_coins trigger exists and works
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;

CREATE OR REPLACE FUNCTION public.award_welcome_coins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Award 100 welcome coins
  INSERT INTO public.user_points (user_id, balance, lifetime_earned)
  VALUES (NEW.id, 100, 100)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Record transaction
  INSERT INTO public.point_transactions (user_id, amount, transaction_type, source, description)
  VALUES (NEW.id, 100, 'earn', 'signup_bonus', 'Welcome to Chatr! 🎉 Here are your first 100 Chatr Coins!')
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail
    RAISE WARNING 'Error in award_welcome_coins: %', SQLERRM;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.award_welcome_coins();