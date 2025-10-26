-- Comprehensive fix: Drop ALL conflicting triggers and recreate cleanly

-- Drop ALL profile/auth related triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles CASCADE;
DROP TRIGGER IF EXISTS on_profile_created_award_coins ON public.profiles CASCADE;
DROP TRIGGER IF EXISTS on_profile_created_points ON public.profiles CASCADE;

-- Drop ALL related functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.award_welcome_coins() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_points() CASCADE;

-- Create single comprehensive trigger for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''
AS $$
DECLARE
  v_username text;
  v_phone text;
BEGIN
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone_number',
    'User_' || substring(NEW.id::text from 1 for 8)
  );
  
  v_phone := COALESCE(
    NEW.phone,
    NEW.raw_user_meta_data->>'phone_number'
  );
  
  -- Create profile
  INSERT INTO public.profiles (
    id, username, avatar_url, email, phone_number, onboarding_completed
  )
  VALUES (
    NEW.id, v_username, NEW.raw_user_meta_data->>'avatar_url', NEW.email, v_phone, false
  )
  ON CONFLICT (id) DO UPDATE SET
    phone_number = COALESCE(EXCLUDED.phone_number, public.profiles.phone_number),
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    username = COALESCE(EXCLUDED.username, public.profiles.username),
    onboarding_completed = false,
    updated_at = now();
  
  -- Award welcome points (only if not already awarded)
  INSERT INTO public.user_points (user_id, balance, lifetime_earned)
  VALUES (NEW.id, 100, 100)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Record transaction (only if not already recorded)
  INSERT INTO public.point_transactions (user_id, amount, transaction_type, source, description)
  VALUES (NEW.id, 100, 'earn', 'signup_bonus', 'Welcome to Chatr! 🎉')
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Fix existing user
UPDATE public.profiles 
SET onboarding_completed = false, updated_at = now()
WHERE id = 'b8a86e8d-4fc0-4c86-870b-59877d4d9cc7';