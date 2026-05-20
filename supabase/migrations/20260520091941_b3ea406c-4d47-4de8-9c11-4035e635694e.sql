
CREATE TABLE IF NOT EXISTS public.champion_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('referrals','calls','streak','messages','community','custom')),
  target_value INTEGER NOT NULL CHECK (target_value > 0),
  points_reward INTEGER NOT NULL DEFAULT 0,
  period TEXT NOT NULL DEFAULT 'weekly' CHECK (period IN ('daily','weekly','season')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.champion_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Missions readable by authenticated" ON public.champion_missions FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.champion_mission_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id UUID NOT NULL REFERENCES public.champion_missions(id) ON DELETE CASCADE,
  progress_value INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, mission_id)
);
ALTER TABLE public.champion_mission_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own mission progress" ON public.champion_mission_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own mission progress" ON public.champion_mission_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own mission progress" ON public.champion_mission_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_mission_progress_user ON public.champion_mission_progress(user_id);

CREATE TABLE IF NOT EXISTS public.champion_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  tier_required TEXT NOT NULL DEFAULT 'Bronze' CHECK (tier_required IN ('Bronze','Silver','Gold','Platinum')),
  points_cost INTEGER NOT NULL CHECK (points_cost >= 0),
  stock INTEGER,
  icon TEXT NOT NULL DEFAULT 'gift',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.champion_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rewards readable by authenticated" ON public.champion_rewards FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.champion_reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES public.champion_rewards(id) ON DELETE CASCADE,
  points_spent INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','fulfilled','cancelled')),
  delivery_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.champion_reward_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own redemptions" ON public.champion_reward_redemptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own redemptions" ON public.champion_reward_redemptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_user ON public.champion_reward_redemptions(user_id);

-- Seed missions
INSERT INTO public.champion_missions (code, title, description, category, target_value, points_reward, period) VALUES
  ('refer_3_weekly', 'Refer 3 friends', 'Invite 3 friends to join Chatr this week', 'referrals', 3, 150, 'weekly'),
  ('calls_10_weekly', 'Make 10 calls', 'Complete 10 successful calls this week', 'calls', 10, 100, 'weekly'),
  ('streak_7', '7-day streak', 'Open Chatr 7 days in a row', 'streak', 7, 200, 'weekly'),
  ('messages_50_daily', 'Send 50 messages', 'Stay active with 50 messages today', 'messages', 50, 30, 'daily'),
  ('community_post_1_daily', 'Post in a community', 'Share one post in any community today', 'community', 1, 25, 'daily'),
  ('refer_25_season', 'Season referral champ', 'Refer 25 friends this season', 'referrals', 25, 1000, 'season')
ON CONFLICT (code) DO NOTHING;

-- Seed rewards
INSERT INTO public.champion_rewards (code, title, description, tier_required, points_cost, icon) VALUES
  ('badge_gold_glow', 'Gold profile glow', 'A glowing gold ring around your avatar for 30 days', 'Silver', 500, 'sparkles'),
  ('coins_100', '100 Chatr Coins', 'Top up your wallet with 100 bonus coins', 'Bronze', 200, 'coins'),
  ('upi_50', '₹50 UPI cashback', 'Direct UPI cashback to your linked account', 'Gold', 2000, 'wallet'),
  ('premium_week', '7 days Chatr Premium', 'Unlock premium features for a week', 'Silver', 800, 'crown')
ON CONFLICT (code) DO NOTHING;
