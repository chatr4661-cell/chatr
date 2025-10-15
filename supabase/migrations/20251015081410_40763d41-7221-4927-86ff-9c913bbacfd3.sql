-- ============================================
-- CHATR EXPONENTIAL GROWTH SYSTEM
-- Coin Economy + Referral System + Gamification
-- ============================================

-- 1. COIN ECONOMY TABLES
-- ============================================

-- User coin balances
CREATE TABLE IF NOT EXISTS chatr_coin_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_coins INTEGER NOT NULL DEFAULT 0,
  lifetime_earned INTEGER NOT NULL DEFAULT 0,
  lifetime_spent INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_login_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Coin transaction history
CREATE TABLE IF NOT EXISTS chatr_coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earn', 'spend', 'reward', 'bonus', 'refund')),
  amount INTEGER NOT NULL,
  source TEXT NOT NULL,
  description TEXT NOT NULL,
  reference_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Coin reward definitions
CREATE TABLE IF NOT EXISTS chatr_coin_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL UNIQUE,
  coin_amount INTEGER NOT NULL,
  rupee_value NUMERIC(10,2) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  max_per_day INTEGER,
  max_total INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. REFERRAL SYSTEM TABLES
-- ============================================

-- User referral data
CREATE TABLE IF NOT EXISTS chatr_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rewarded', 'expired')),
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 4),
  coins_earned INTEGER DEFAULT 0,
  activated_at TIMESTAMPTZ,
  rewarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(referred_user_id)
);

-- Referral codes (unique per user)
CREATE TABLE IF NOT EXISTS chatr_referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  qr_code_url TEXT,
  total_uses INTEGER DEFAULT 0,
  total_rewards INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Multi-level referral tracking
CREATE TABLE IF NOT EXISTS chatr_referral_network (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  root_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level >= 1 AND level <= 4),
  total_network_size INTEGER DEFAULT 0,
  total_coins_from_network INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. GAMIFICATION TABLES
-- ============================================

-- Daily login streaks
CREATE TABLE IF NOT EXISTS chatr_login_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_login_date DATE,
  total_logins INTEGER DEFAULT 0,
  streak_rewards_claimed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Leaderboards
CREATE TABLE IF NOT EXISTS chatr_leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leaderboard_type TEXT NOT NULL CHECK (leaderboard_type IN ('referrals', 'coins', 'engagement', 'creators', 'businesses')),
  score INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  city TEXT,
  country TEXT DEFAULT 'India',
  period TEXT NOT NULL DEFAULT 'all_time' CHECK (period IN ('daily', 'weekly', 'monthly', 'all_time')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User badges and achievements
CREATE TABLE IF NOT EXISTS chatr_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_type TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL,
  coin_reward INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User earned badges
CREATE TABLE IF NOT EXISTS chatr_user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES chatr_badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- 4. VIRAL SHARING TABLES
-- ============================================

-- Share tracking
CREATE TABLE IF NOT EXISTS chatr_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_type TEXT NOT NULL CHECK (share_type IN ('post', 'app', 'business', 'group', 'content', 'referral')),
  shared_item_id UUID,
  platform TEXT,
  referral_code TEXT,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  coins_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. CREATOR & BUSINESS REWARDS
-- ============================================

-- Creator rewards
CREATE TABLE IF NOT EXISTS chatr_creator_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  engagement_score INTEGER DEFAULT 0,
  coins_earned INTEGER DEFAULT 0,
  revenue_share NUMERIC(10,2) DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Business ad spending rewards
CREATE TABLE IF NOT EXISTS chatr_business_ad_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  referrer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ad_spend_amount NUMERIC(10,2) NOT NULL,
  commission_percentage NUMERIC(5,2) DEFAULT 5.0,
  coins_earned INTEGER NOT NULL,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'cancelled')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_coin_balances_user ON chatr_coin_balances(user_id);
CREATE INDEX idx_coin_transactions_user ON chatr_coin_transactions(user_id);
CREATE INDEX idx_coin_transactions_type ON chatr_coin_transactions(transaction_type);
CREATE INDEX idx_coin_transactions_created ON chatr_coin_transactions(created_at DESC);

CREATE INDEX idx_referrals_referrer ON chatr_referrals(referrer_id);
CREATE INDEX idx_referrals_referred ON chatr_referrals(referred_user_id);
CREATE INDEX idx_referrals_status ON chatr_referrals(status);
CREATE INDEX idx_referrals_code ON chatr_referrals(referral_code);

CREATE INDEX idx_referral_codes_user ON chatr_referral_codes(user_id);
CREATE INDEX idx_referral_codes_code ON chatr_referral_codes(code);

CREATE INDEX idx_referral_network_root ON chatr_referral_network(root_user_id);
CREATE INDEX idx_referral_network_user ON chatr_referral_network(user_id);
CREATE INDEX idx_referral_network_level ON chatr_referral_network(level);

CREATE INDEX idx_login_streaks_user ON chatr_login_streaks(user_id);
CREATE INDEX idx_login_streaks_current ON chatr_login_streaks(current_streak DESC);

CREATE INDEX idx_leaderboards_type_period ON chatr_leaderboards(leaderboard_type, period);
CREATE INDEX idx_leaderboards_rank ON chatr_leaderboards(rank);
CREATE INDEX idx_leaderboards_city ON chatr_leaderboards(city);

CREATE INDEX idx_shares_user ON chatr_shares(user_id);
CREATE INDEX idx_shares_type ON chatr_shares(share_type);
CREATE INDEX idx_shares_code ON chatr_shares(referral_code);

-- 7. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE chatr_coin_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatr_coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatr_coin_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatr_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatr_referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatr_referral_network ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatr_login_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatr_leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatr_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatr_user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatr_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatr_creator_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatr_business_ad_rewards ENABLE ROW LEVEL SECURITY;

-- Coin balances policies
CREATE POLICY "Users can view their own coin balance"
  ON chatr_coin_balances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can update coin balances"
  ON chatr_coin_balances FOR ALL
  USING (true);

-- Coin transactions policies
CREATE POLICY "Users can view their transactions"
  ON chatr_coin_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert transactions"
  ON chatr_coin_transactions FOR INSERT
  WITH CHECK (true);

-- Coin rewards policies (public read)
CREATE POLICY "Anyone can view active rewards"
  ON chatr_coin_rewards FOR SELECT
  USING (is_active = true);

-- Referral policies
CREATE POLICY "Users can view their referrals"
  ON chatr_referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);

CREATE POLICY "System can manage referrals"
  ON chatr_referrals FOR ALL
  USING (true);

-- Referral codes policies
CREATE POLICY "Users can view their referral code"
  ON chatr_referral_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view active codes for validation"
  ON chatr_referral_codes FOR SELECT
  USING (is_active = true);

CREATE POLICY "System can manage codes"
  ON chatr_referral_codes FOR ALL
  USING (true);

-- Network policies
CREATE POLICY "Users can view their network"
  ON chatr_referral_network FOR SELECT
  USING (auth.uid() = root_user_id OR auth.uid() = user_id);

CREATE POLICY "System can manage network"
  ON chatr_referral_network FOR ALL
  USING (true);

-- Login streaks policies
CREATE POLICY "Users can view their streaks"
  ON chatr_login_streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage streaks"
  ON chatr_login_streaks FOR ALL
  USING (true);

-- Leaderboards policies (public)
CREATE POLICY "Anyone can view leaderboards"
  ON chatr_leaderboards FOR SELECT
  USING (true);

CREATE POLICY "System can manage leaderboards"
  ON chatr_leaderboards FOR ALL
  USING (true);

-- Badges policies
CREATE POLICY "Anyone can view badges"
  ON chatr_badges FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can view their earned badges"
  ON chatr_user_badges FOR SELECT
  USING (auth.uid() = user_id);

-- Shares policies
CREATE POLICY "Users can view their shares"
  ON chatr_shares FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage shares"
  ON chatr_shares FOR ALL
  USING (true);

-- Creator rewards policies
CREATE POLICY "Users can view their creator rewards"
  ON chatr_creator_rewards FOR SELECT
  USING (auth.uid() = user_id);

-- Business ad rewards policies
CREATE POLICY "Users can view their ad commission"
  ON chatr_business_ad_rewards FOR SELECT
  USING (auth.uid() = referrer_id);

-- 8. TRIGGERS
-- ============================================

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_chatr_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_coin_balances_updated_at
  BEFORE UPDATE ON chatr_coin_balances
  FOR EACH ROW EXECUTE FUNCTION update_chatr_updated_at();

CREATE TRIGGER update_referral_codes_updated_at
  BEFORE UPDATE ON chatr_referral_codes
  FOR EACH ROW EXECUTE FUNCTION update_chatr_updated_at();

CREATE TRIGGER update_login_streaks_updated_at
  BEFORE UPDATE ON chatr_login_streaks
  FOR EACH ROW EXECUTE FUNCTION update_chatr_updated_at();

-- 9. INSERT DEFAULT REWARD VALUES
-- ============================================

INSERT INTO chatr_coin_rewards (action_type, coin_amount, rupee_value, description, max_per_day, max_total) VALUES
  ('referral_signup', 500, 50.00, 'New user joins using your referral', NULL, NULL),
  ('profile_complete', 100, 10.00, 'Complete your profile', 1, 1),
  ('install_3_apps', 200, 20.00, 'Install 3 mini-apps', 1, 1),
  ('business_referral', 1000, 100.00, 'Refer a business/creator', NULL, NULL),
  ('user_7day_active', 300, 30.00, 'Referred user stays active 7 days', NULL, NULL),
  ('create_content', 100, 10.00, 'Create content or post', 5, NULL),
  ('daily_login', 50, 5.00, 'Daily login bonus', 1, NULL),
  ('streak_7days', 200, 20.00, '7-day login streak bonus', NULL, NULL),
  ('streak_30days', 500, 50.00, '30-day login streak bonus', NULL, NULL),
  ('share_post', 25, 2.50, 'Share a post with referral', 10, NULL),
  ('share_app', 50, 5.00, 'Share a mini-app', 10, NULL)
ON CONFLICT (action_type) DO NOTHING;

-- 10. INSERT DEFAULT BADGES
-- ============================================

INSERT INTO chatr_badges (badge_type, name, description, requirement_type, requirement_value, coin_reward) VALUES
  ('newbie', 'Newbie', 'Welcome to Chatr!', 'signup', 1, 100),
  ('referrer_bronze', 'Bronze Referrer', 'Refer 10 users', 'referrals', 10, 500),
  ('referrer_silver', 'Silver Referrer', 'Refer 50 users', 'referrals', 50, 2000),
  ('referrer_gold', 'Gold Referrer', 'Refer 100 users', 'referrals', 100, 5000),
  ('coin_master_1k', 'Coin Master 1K', 'Earn 1,000 coins', 'coins_earned', 1000, 100),
  ('coin_master_10k', 'Coin Master 10K', 'Earn 10,000 coins', 'coins_earned', 10000, 1000),
  ('streak_warrior', 'Streak Warrior', '30-day login streak', 'streak', 30, 500),
  ('creator_pro', 'Creator Pro', 'Create 100 posts', 'content_created', 100, 1000),
  ('influencer', 'Influencer', '1000 followers', 'followers', 1000, 2000),
  ('top_100', 'Top 100', 'Reach top 100 leaderboard', 'leaderboard_rank', 100, 1000)
ON CONFLICT (badge_type) DO NOTHING;