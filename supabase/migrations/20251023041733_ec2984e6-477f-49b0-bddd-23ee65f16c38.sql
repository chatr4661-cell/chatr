-- Fix phone sync by updating profiles table and handle_new_user function
-- Add phone_number column if missing and ensure proper syncing

-- Update handle_new_user function to properly sync phone numbers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
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
    COALESCE(
      NEW.phone,
      NEW.raw_user_meta_data->>'phone_number'
    ),
    NEW.raw_user_meta_data->>'provider_id'
  )
  ON CONFLICT (id) DO UPDATE SET
    phone_number = COALESCE(
      EXCLUDED.phone_number,
      profiles.phone_number
    ),
    email = COALESCE(EXCLUDED.email, profiles.email),
    updated_at = now();
  
  RETURN NEW;
END;
$function$;

-- Create function to award welcome coins (100 coins for new users)
CREATE OR REPLACE FUNCTION public.award_welcome_coins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
END;
$function$;

-- Create trigger for welcome coins
DROP TRIGGER IF EXISTS on_profile_created_award_coins ON profiles;
CREATE TRIGGER on_profile_created_award_coins
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION award_welcome_coins();

-- Create referral tracking tables
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  code text UNIQUE NOT NULL,
  uses integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  referred_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reward_claimed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(referrer_id, referred_id)
);

-- Create activity tracking for earning coins
CREATE TABLE IF NOT EXISTS public.user_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  activity_type text NOT NULL,
  coins_earned integer DEFAULT 0,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own referral codes"
  ON referral_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own referral codes"
  ON referral_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their referrals"
  ON referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "System can create referrals"
  ON referrals FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their activities"
  ON user_activities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create activities"
  ON user_activities FOR INSERT
  WITH CHECK (true);

-- Function to generate referral code
CREATE OR REPLACE FUNCTION public.generate_user_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  new_code text;
  user_id_val uuid;
BEGIN
  user_id_val := auth.uid();
  
  -- Check if user already has a code
  SELECT code INTO new_code
  FROM referral_codes
  WHERE user_id = user_id_val;
  
  IF new_code IS NOT NULL THEN
    RETURN new_code;
  END IF;
  
  -- Generate new code
  new_code := upper(substring(md5(random()::text) from 1 for 8));
  
  INSERT INTO referral_codes (user_id, code)
  VALUES (user_id_val, new_code)
  RETURNING code INTO new_code;
  
  RETURN new_code;
END;
$function$;

-- Function to process referral and award coins
CREATE OR REPLACE FUNCTION public.process_referral_reward(referral_code_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  referrer_user_id uuid;
  referred_user_id uuid;
BEGIN
  referred_user_id := auth.uid();
  
  -- Find referrer
  SELECT user_id INTO referrer_user_id
  FROM referral_codes
  WHERE code = referral_code_param;
  
  IF referrer_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Can't refer yourself
  IF referrer_user_id = referred_user_id THEN
    RETURN false;
  END IF;
  
  -- Create referral record
  INSERT INTO referrals (referrer_id, referred_id)
  VALUES (referrer_user_id, referred_user_id)
  ON CONFLICT DO NOTHING;
  
  -- Award 50 coins to referrer
  UPDATE user_points
  SET balance = balance + 50,
      lifetime_earned = lifetime_earned + 50
  WHERE user_id = referrer_user_id;
  
  INSERT INTO point_transactions (user_id, amount, transaction_type, source, description)
  VALUES (referrer_user_id, 50, 'earn', 'referral', 'Referral bonus: New user joined!');
  
  -- Award 25 bonus coins to referred user
  UPDATE user_points
  SET balance = balance + 25,
      lifetime_earned = lifetime_earned + 25
  WHERE user_id = referred_user_id;
  
  INSERT INTO point_transactions (user_id, amount, transaction_type, source, description)
  VALUES (referred_user_id, 25, 'earn', 'referral_bonus', 'Bonus for using a referral code!');
  
  -- Update referral code usage
  UPDATE referral_codes
  SET uses = uses + 1
  WHERE code = referral_code_param;
  
  RETURN true;
END;
$function$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_activities_user ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON user_activities(activity_type);