-- Stealth Mode System with 3 Tiers

-- User stealth mode settings table
CREATE TABLE public.user_stealth_modes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  current_mode TEXT NOT NULL DEFAULT 'default' CHECK (current_mode IN ('default', 'seller', 'rewards')),
  seller_verified BOOLEAN DEFAULT false,
  seller_verified_at TIMESTAMP WITH TIME ZONE,
  rewards_opted_in BOOLEAN DEFAULT false,
  rewards_opted_in_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Seller mode features/settings
CREATE TABLE public.seller_mode_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  business_name TEXT,
  business_category TEXT,
  business_hours JSONB DEFAULT '{}',
  quick_replies JSONB DEFAULT '[]',
  auto_response_enabled BOOLEAN DEFAULT false,
  auto_response_message TEXT,
  away_message TEXT,
  priority_support BOOLEAN DEFAULT false,
  broadcast_enabled BOOLEAN DEFAULT true,
  analytics_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Seller analytics tracking
CREATE TABLE public.seller_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  avg_response_time_seconds INTEGER,
  customer_count INTEGER DEFAULT 0,
  products_shared INTEGER DEFAULT 0,
  broadcasts_sent INTEGER DEFAULT 0,
  UNIQUE(user_id, date)
);

-- Rewards mode settings and multipliers
CREATE TABLE public.rewards_mode_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  coin_multiplier DECIMAL(3,1) DEFAULT 1.0,
  daily_challenges_enabled BOOLEAN DEFAULT true,
  ad_rewards_enabled BOOLEAN DEFAULT true,
  survey_rewards_enabled BOOLEAN DEFAULT true,
  streak_bonus_enabled BOOLEAN DEFAULT true,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  total_coins_earned INTEGER DEFAULT 0,
  total_ads_watched INTEGER DEFAULT 0,
  total_surveys_completed INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Daily challenges for rewards mode
CREATE TABLE public.rewards_daily_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_name TEXT NOT NULL,
  challenge_description TEXT,
  challenge_type TEXT NOT NULL, -- 'messages', 'referrals', 'logins', 'ads', 'surveys'
  target_value INTEGER NOT NULL,
  coin_reward INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User challenge progress
CREATE TABLE public.user_challenge_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  challenge_id UUID NOT NULL REFERENCES public.rewards_daily_challenges(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  current_progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  coins_awarded INTEGER DEFAULT 0,
  UNIQUE(user_id, challenge_id, date)
);

-- Subscription plans for seller mode
CREATE TABLE public.stealth_mode_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('seller_basic', 'seller_pro', 'rewards_premium')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'trial')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  amount_paid DECIMAL(10,2),
  currency TEXT DEFAULT 'INR',
  payment_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_stealth_modes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_mode_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards_mode_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards_daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stealth_mode_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their stealth mode" ON public.user_stealth_modes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their seller settings" ON public.seller_mode_settings
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their seller analytics" ON public.seller_analytics
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their rewards settings" ON public.rewards_mode_settings
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view active challenges" ON public.rewards_daily_challenges
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can manage their challenge progress" ON public.user_challenge_progress
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their subscriptions" ON public.stealth_mode_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Seed daily challenges
INSERT INTO public.rewards_daily_challenges (challenge_name, challenge_description, challenge_type, target_value, coin_reward) VALUES
  ('Message Master', 'Send 10 messages today', 'messages', 10, 50),
  ('Social Butterfly', 'Start 3 new conversations', 'messages', 3, 30),
  ('Daily Login', 'Log in to the app', 'logins', 1, 10),
  ('Referral King', 'Invite 1 friend to join', 'referrals', 1, 100),
  ('Ad Watcher', 'Watch 5 reward ads', 'ads', 5, 25),
  ('Survey Pro', 'Complete 2 surveys', 'surveys', 2, 75),
  ('Chat Champion', 'Send 50 messages', 'messages', 50, 150),
  ('Weekly Warrior', 'Maintain 7-day streak', 'logins', 7, 200);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_stealth_mode_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_stealth_modes_updated_at
  BEFORE UPDATE ON public.user_stealth_modes
  FOR EACH ROW EXECUTE FUNCTION update_stealth_mode_updated_at();

CREATE TRIGGER update_seller_mode_settings_updated_at
  BEFORE UPDATE ON public.seller_mode_settings
  FOR EACH ROW EXECUTE FUNCTION update_stealth_mode_updated_at();

CREATE TRIGGER update_rewards_mode_settings_updated_at
  BEFORE UPDATE ON public.rewards_mode_settings
  FOR EACH ROW EXECUTE FUNCTION update_stealth_mode_updated_at();