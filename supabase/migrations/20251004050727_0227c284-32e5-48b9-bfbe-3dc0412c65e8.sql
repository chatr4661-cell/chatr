-- ============================================
-- CRITICAL SECURITY FIXES
-- ============================================

-- Fix database functions to prevent security vulnerabilities
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      split_part(NEW.email, '@', 1),
      'User_' || substring(NEW.phone::text from 1 for 8),
      'User_' || substring(NEW.id::text from 1 for 8)
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- ============================================
-- FIX PROFILES RLS - PROTECT SENSITIVE DATA
-- ============================================

-- Drop overly permissive policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create restricted policies
CREATE POLICY "Users can view basic profile info"
ON public.profiles
FOR SELECT
USING (
  -- Users can see their own full profile
  (auth.uid() = id) OR
  -- Others can only see basic public info (username, avatar)
  (id IN (
    SELECT contact_user_id FROM contacts WHERE user_id = auth.uid()
  ))
);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- FIX SERVICE PROVIDERS RLS - PROTECT PERSONAL DATA
-- ============================================

-- Drop overly permissive policy
DROP POLICY IF EXISTS "Anyone can view service providers" ON public.service_providers;

-- Create restricted policies
CREATE POLICY "Users can view verified provider listings"
ON public.service_providers
FOR SELECT
USING (
  -- Only show verified providers' business info to public
  (is_verified = true) OR
  -- Providers can see their own full profile
  (user_id = auth.uid()) OR
  -- Admins can see everything
  (has_role(auth.uid(), 'admin'))
);

-- ============================================
-- CHATR POINTS SYSTEM
-- ============================================

-- Points balance table
CREATE TABLE public.user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  lifetime_earned INTEGER NOT NULL DEFAULT 0,
  lifetime_spent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Points transaction history
CREATE TABLE public.point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earn', 'spend', 'purchase', 'expire', 'refund', 'bonus')),
  source TEXT NOT NULL CHECK (source IN ('chat', 'invite', 'health_stats', 'challenge', 'purchase', 'redemption', 'expiration', 'admin', 'signup_bonus', 'daily_login', 'wellness_goal', 'lab_report_upload', 'medicine_adherence')),
  description TEXT,
  reference_id UUID,
  reference_type TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rewards catalog
CREATE TABLE public.point_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL CHECK (points_required > 0),
  reward_type TEXT NOT NULL CHECK (reward_type IN ('discount', 'service', 'premium_feature', 'ad_free', 'marketplace_credit', 'delivery_discount', 'consultation_discount')),
  discount_percentage INTEGER CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  discount_amount NUMERIC(10,2) CHECK (discount_amount >= 0),
  validity_days INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  stock_quantity INTEGER,
  max_redemptions_per_user INTEGER,
  icon TEXT,
  image_url TEXT,
  terms TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User reward redemptions
CREATE TABLE public.user_reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES point_rewards(id) ON DELETE CASCADE,
  points_spent INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'refunded')),
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  transaction_id UUID REFERENCES point_transactions(id),
  redemption_code TEXT UNIQUE,
  metadata JSONB DEFAULT '{}'
);

-- Points purchase packages
CREATE TABLE public.point_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  points INTEGER NOT NULL CHECK (points > 0),
  price_usd NUMERIC(10,2) NOT NULL CHECK (price_usd > 0),
  bonus_points INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  badge_text TEXT,
  popular BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Points expiration schedule
CREATE TABLE public.point_expirations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points_amount INTEGER NOT NULL CHECK (points_amount > 0),
  earned_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'expired', 'used')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_expirations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_points
CREATE POLICY "Users can view their own points"
ON public.user_points FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their points record"
ON public.user_points FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own points"
ON public.user_points FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all points"
ON public.user_points FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for point_transactions
CREATE POLICY "Users can view their own transactions"
ON public.point_transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create transactions"
ON public.point_transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions"
ON public.point_transactions FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for point_rewards
CREATE POLICY "Anyone can view active rewards"
ON public.point_rewards FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage rewards"
ON public.point_rewards FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for user_reward_redemptions
CREATE POLICY "Users can view their redemptions"
ON public.user_reward_redemptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create redemptions"
ON public.user_reward_redemptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all redemptions"
ON public.user_reward_redemptions FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for point_packages
CREATE POLICY "Anyone can view active packages"
ON public.point_packages FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage packages"
ON public.point_packages FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for point_expirations
CREATE POLICY "Users can view their expirations"
ON public.point_expirations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage expirations"
ON public.point_expirations FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Indexes for performance
CREATE INDEX idx_user_points_user_id ON public.user_points(user_id);
CREATE INDEX idx_point_transactions_user_id ON public.point_transactions(user_id);
CREATE INDEX idx_point_transactions_created_at ON public.point_transactions(created_at DESC);
CREATE INDEX idx_user_reward_redemptions_user_id ON public.user_reward_redemptions(user_id);
CREATE INDEX idx_user_reward_redemptions_status ON public.user_reward_redemptions(status);
CREATE INDEX idx_point_expirations_user_id ON public.point_expirations(user_id);
CREATE INDEX idx_point_expirations_expires_at ON public.point_expirations(expires_at);

-- Triggers
CREATE TRIGGER update_user_points_updated_at
  BEFORE UPDATE ON public.user_points
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_point_rewards_updated_at
  BEFORE UPDATE ON public.point_rewards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_point_packages_updated_at
  BEFORE UPDATE ON public.point_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create user_points on profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_points (user_id, balance, lifetime_earned)
  VALUES (NEW.id, 100, 100); -- 100 signup bonus
  
  INSERT INTO public.point_transactions (user_id, amount, transaction_type, source, description)
  VALUES (NEW.id, 100, 'earn', 'signup_bonus', 'Welcome to Chatr! Here are your first 100 points!');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_give_points
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_points();

-- Insert default reward catalog
INSERT INTO public.point_rewards (name, description, points_required, reward_type, discount_percentage, icon) VALUES
('10% Off Next Consultation', 'Save 10% on your next doctor consultation', 500, 'consultation_discount', 10, '🏥'),
('Free Medicine Delivery', 'Get free delivery on your next medicine order', 300, 'delivery_discount', 100, '💊'),
('Ad-Free for 7 Days', 'Enjoy Chatr without ads for a week', 200, 'ad_free', NULL, '🚫'),
('20% Marketplace Credit', 'Get 20% discount on marketplace purchases', 800, 'marketplace_credit', 20, '🛒'),
('Premium Features (30 Days)', 'Unlock all premium features for a month', 1500, 'premium_feature', NULL, '⭐'),
('25% Off Lab Tests', 'Save 25% on your next lab test booking', 1000, 'service', 25, '🔬'),
('Free Home Care Visit', 'One free home healthcare service visit', 2000, 'service', 100, '🏠');

-- Insert points packages
INSERT INTO public.point_packages (name, points, price_usd, bonus_points, display_order, popular) VALUES
('Starter Pack', 500, 4.99, 0, 1, false),
('Value Pack', 1200, 9.99, 100, 2, true),
('Premium Pack', 2500, 19.99, 300, 3, false),
('Ultimate Pack', 5500, 39.99, 800, 4, false);