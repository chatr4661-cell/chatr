
-- Catalog of all features users can be told about
CREATE TABLE IF NOT EXISTS public.feature_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text UNIQUE NOT NULL,
  module text NOT NULL, -- jobs, food, deals, games, earn, marketplace, healthcare, calls, chatr_plus, ai, contacts, etc.
  title text NOT NULL,
  description text NOT NULL,
  cta_route text NOT NULL,
  emoji text,
  priority int NOT NULL DEFAULT 50, -- 0-100
  active boolean NOT NULL DEFAULT true,
  requires_location boolean NOT NULL DEFAULT false,
  notification_templates jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{title, body, hook}]
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read feature catalog"
  ON public.feature_catalog FOR SELECT TO authenticated, anon USING (active = true);

CREATE POLICY "Admins manage feature catalog"
  ON public.feature_catalog FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'ceo'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'ceo'::public.app_role));

-- Tracks which features each user has engaged with
CREATE TABLE IF NOT EXISTS public.user_feature_engagement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feature_key text NOT NULL,
  module text NOT NULL,
  visit_count int NOT NULL DEFAULT 0,
  last_visited_at timestamptz,
  first_visited_at timestamptz,
  conversion_count int NOT NULL DEFAULT 0, -- did meaningful action
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_ufe_user ON public.user_feature_engagement(user_id);
CREATE INDEX IF NOT EXISTS idx_ufe_module ON public.user_feature_engagement(module);

ALTER TABLE public.user_feature_engagement ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own engagement"
  ON public.user_feature_engagement FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own engagement"
  ON public.user_feature_engagement FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own engagement"
  ON public.user_feature_engagement FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Log of every smart push sent (to dedupe and analyze)
CREATE TABLE IF NOT EXISTS public.smart_push_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feature_key text NOT NULL,
  module text NOT NULL,
  slot text NOT NULL, -- morning, midday, afternoon, evening, night, late
  title text NOT NULL,
  body text NOT NULL,
  cta_route text,
  delivery_status text NOT NULL DEFAULT 'pending', -- pending, delivered, failed, skipped, opened
  error text,
  ai_reasoning text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  opened_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spl_user_sent ON public.smart_push_log(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_spl_user_feature ON public.smart_push_log(user_id, feature_key, sent_at DESC);

ALTER TABLE public.smart_push_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own pushes"
  ON public.smart_push_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins see all pushes"
  ON public.smart_push_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'ceo'::public.app_role));

-- User preferences for smart push (per-module mute + frequency)
CREATE TABLE IF NOT EXISTS public.smart_push_preferences (
  user_id uuid PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  max_per_day int NOT NULL DEFAULT 6,
  quiet_hours_start int NOT NULL DEFAULT 22, -- 24h
  quiet_hours_end int NOT NULL DEFAULT 8,
  muted_modules text[] NOT NULL DEFAULT ARRAY[]::text[],
  language text NOT NULL DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.smart_push_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own prefs"
  ON public.smart_push_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at triggers
CREATE TRIGGER trg_feature_catalog_updated BEFORE UPDATE ON public.feature_catalog FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_ufe_updated BEFORE UPDATE ON public.user_feature_engagement FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_spp_updated BEFORE UPDATE ON public.smart_push_preferences FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Seed feature catalog with core Chatr modules
INSERT INTO public.feature_catalog (feature_key, module, title, description, cta_route, emoji, priority, notification_templates) VALUES
('earn_micro_tasks', 'earn', 'Earn Money', 'Complete simple tasks for instant rewards', '/earn', '💰', 95,
  '[{"title":"💰 ₹50 waiting for you","body":"Complete a 30-second task and earn instantly. No skills needed."},{"title":"🎯 New mission unlocked","body":"Earn ₹25 in under a minute. Tap to start."},{"title":"💸 Your earnings are ready","body":"Today''s missions can pay you ₹100+. Don''t miss out."}]'),
('chatr_jobs', 'jobs', 'Find Jobs', 'Browse jobs near you', '/jobs', '💼', 85,
  '[{"title":"💼 New jobs near you","body":"3 fresh openings posted today. Apply in 1 tap."},{"title":"🔥 Job match alert","body":"A role matching your profile just opened up."},{"title":"📈 Hiring now","body":"Companies hiring this week — see who''s looking."}]'),
('food_delivery', 'food', 'Order Food', 'Restaurants near you with deals', '/food', '🍔', 80,
  '[{"title":"🍕 Hungry? 30% off near you","body":"Top-rated restaurants delivering in 25 mins."},{"title":"🍔 Lunch deals end soon","body":"Save up to ₹150 on orders today only."},{"title":"🌮 Your favorites are open","body":"Order from places you''ve loved before."}]'),
('local_deals', 'deals', 'Local Deals', 'Discounts at services near you', '/local-deals', '🏷️', 75,
  '[{"title":"🏷️ 50% off near you","body":"Salons, gyms, repairs — limited slots today."},{"title":"⚡ Flash deal in your area","body":"This offer ends in 2 hours."},{"title":"💎 New deal unlocked","body":"Save big on services you actually use."}]'),
('chatr_games', 'games', 'Play & Earn', 'Play games and earn coins', '/chatr-games', '🎮', 70,
  '[{"title":"🎮 Daily challenge ready","body":"Beat today''s level — top players earn ₹50."},{"title":"🏆 Climb the leaderboard","body":"You''re close to the top 100. One game to go."},{"title":"🎯 Bonus coins unlocked","body":"Play a 2-min game and double your coins."}]'),
('marketplace', 'marketplace', 'Marketplace', 'Buy & sell locally', '/marketplace', '🛒', 65,
  '[{"title":"🛒 New items in marketplace","body":"Fresh listings from sellers near you."},{"title":"💸 Price dropped on items you viewed","body":"That product just got cheaper."},{"title":"🎁 Free shipping today","body":"Order over ₹299 and shipping is on us."}]'),
('healthcare', 'healthcare', 'Health Wallet', 'Doctors, medicines & records', '/healthcare', '🩺', 70,
  '[{"title":"🩺 Free health check nearby","body":"Doctors offering free consults this week."},{"title":"💊 Refill your prescription","body":"Order medicines and get them today."},{"title":"📋 Update your health profile","body":"Get personalized care recommendations."}]'),
('contacts_invite', 'contacts', 'Invite Friends', 'Earn ₹50 per friend who joins', '/referrals', '👥', 90,
  '[{"title":"👥 ₹50 for every friend","body":"Invite 1 friend and earn instantly. No limit."},{"title":"💸 Your referral link earned ₹0","body":"Share once, earn forever. Send it now."},{"title":"🎁 Friends are joining Chatr","body":"Be the one who invites them — earn ₹50 each."}]'),
('chatr_plus', 'chatr_plus', 'Chatr+ Services', 'Hire pros for any task', '/chatr-plus', '⭐', 60,
  '[{"title":"⭐ Top-rated pros near you","body":"Plumbers, cleaners, tutors — book in 2 taps."},{"title":"🛠️ Service price match","body":"15% cheaper than other apps. Verified."},{"title":"💯 Try Chatr+ once","body":"Get your first booking with ₹100 off."}]'),
('ai_assistant', 'ai', 'Chatr AI', 'Your personal AI for anything', '/ai', '✨', 55,
  '[{"title":"✨ Ask Chatr AI anything","body":"Translate, summarize, plan — all free."},{"title":"🧠 Try AI for your work","body":"Draft messages, emails, ideas in seconds."},{"title":"💡 New AI features unlocked","body":"See what Chatr AI can do for you."}]'),
('dhandha_business', 'business', 'Run Your Business', 'Voice-first billing for shops', '/dhandha', '🧾', 50,
  '[{"title":"🧾 Bill customers in 3 taps","body":"Voice-driven UPI billing for your shop."},{"title":"📊 See today''s sales","body":"Open Dhandha and track your earnings live."},{"title":"💼 You''re a business owner?","body":"Try our free shop assistant."}]'),
('communities', 'communities', 'Join Communities', 'Find your tribe', '/communities', '👥', 45,
  '[{"title":"👥 New community in your city","body":"People near you are chatting now. Join free."},{"title":"🔥 Trending community","body":"500+ people just joined. See what''s up."},{"title":"💬 Communities for your interests","body":"Find people who get you."}]'),
('stories', 'stories', 'Chatr Stories', 'Share your day', '/stories', '📸', 40,
  '[{"title":"📸 3 friends posted stories","body":"See what your contacts shared today."},{"title":"⏰ Your story expired","body":"Post a new one and stay visible."},{"title":"💫 Trending stories","body":"See what''s blowing up on Chatr today."}]'),
('caller_id', 'caller_id', 'Spam Caller ID', 'Block spam calls free', '/caller-id', '🛡️', 65,
  '[{"title":"🛡️ Block spam calls free","body":"Better than Truecaller. No ads."},{"title":"📞 Unknown caller? Find out who","body":"5M+ verified caller names. Free."},{"title":"🚫 Stop telemarketers","body":"Auto-block spam in 1 tap."}]'),
('wallet_points', 'wallet', 'Chatr Coins', 'Your rewards wallet', '/chatr-points', '🪙', 60,
  '[{"title":"🪙 You have unspent coins","body":"Use them on food, deals, services."},{"title":"💰 Coins about to expire","body":"Spend them before they''re gone."},{"title":"🎁 Bonus coins added","body":"Check your wallet now."}]')
ON CONFLICT (feature_key) DO NOTHING;
