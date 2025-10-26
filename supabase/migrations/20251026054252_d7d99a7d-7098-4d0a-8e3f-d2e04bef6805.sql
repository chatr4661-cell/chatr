-- FameCam Feature Schema

-- Trending categories table
CREATE TABLE IF NOT EXISTS public.trending_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name VARCHAR(100) NOT NULL,
  emoji VARCHAR(10),
  trend_score INTEGER DEFAULT 0,
  region VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- FameCam posts
CREATE TABLE IF NOT EXISTS public.fame_cam_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type VARCHAR(20) NOT NULL, -- 'photo' or 'video'
  caption TEXT,
  hashtags TEXT[],
  ai_virality_score INTEGER DEFAULT 0,
  actual_engagement INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  coins_earned INTEGER DEFAULT 0,
  category_id UUID REFERENCES public.trending_categories(id),
  is_viral BOOLEAN DEFAULT false,
  posted_to_external BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Challenges
CREATE TABLE IF NOT EXISTS public.fame_cam_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.trending_categories(id),
  reward_coins INTEGER DEFAULT 50,
  duration_seconds INTEGER,
  difficulty VARCHAR(20) DEFAULT 'medium', -- easy, medium, hard
  participants_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Challenge participations
CREATE TABLE IF NOT EXISTS public.challenge_participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES public.fame_cam_challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.fame_cam_posts(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  coins_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

-- Fame achievements
CREATE TABLE IF NOT EXISTS public.fame_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  badge_emoji VARCHAR(10),
  requirement_type VARCHAR(50), -- 'first_viral', 'coins_earned', 'challenges_completed'
  requirement_value INTEGER,
  coin_reward INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User achievements
CREATE TABLE IF NOT EXISTS public.user_fame_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES public.fame_achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Fame leaderboard (materialized for performance)
CREATE TABLE IF NOT EXISTS public.fame_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_fame_score INTEGER DEFAULT 0,
  total_posts INTEGER DEFAULT 0,
  total_viral_posts INTEGER DEFAULT 0,
  total_coins_earned INTEGER DEFAULT 0,
  rank INTEGER,
  period VARCHAR(20) DEFAULT 'all_time', -- daily, weekly, monthly, all_time
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trending_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fame_cam_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fame_cam_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fame_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_fame_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fame_leaderboard ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Trending categories (public read)
CREATE POLICY "Trending categories are viewable by everyone"
  ON public.trending_categories FOR SELECT
  USING (true);

-- RLS Policies - FameCam posts
CREATE POLICY "Users can view all fame cam posts"
  ON public.fame_cam_posts FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own fame cam posts"
  ON public.fame_cam_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fame cam posts"
  ON public.fame_cam_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fame cam posts"
  ON public.fame_cam_posts FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies - Challenges
CREATE POLICY "Challenges are viewable by everyone"
  ON public.fame_cam_challenges FOR SELECT
  USING (true);

-- RLS Policies - Challenge participations
CREATE POLICY "Users can view all participations"
  ON public.challenge_participations FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own participations"
  ON public.challenge_participations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies - Achievements
CREATE POLICY "Achievements are viewable by everyone"
  ON public.fame_achievements FOR SELECT
  USING (true);

CREATE POLICY "User achievements are viewable by everyone"
  ON public.user_fame_achievements FOR SELECT
  USING (true);

-- RLS Policies - Leaderboard
CREATE POLICY "Leaderboard is viewable by everyone"
  ON public.fame_leaderboard FOR SELECT
  USING (true);

-- Function to update fame score
CREATE OR REPLACE FUNCTION update_fame_score()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.fame_leaderboard (user_id, total_fame_score, total_posts, total_viral_posts, total_coins_earned)
  VALUES (
    NEW.user_id,
    NEW.ai_virality_score,
    1,
    CASE WHEN NEW.is_viral THEN 1 ELSE 0 END,
    NEW.coins_earned
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_fame_score = public.fame_leaderboard.total_fame_score + NEW.ai_virality_score,
    total_posts = public.fame_leaderboard.total_posts + 1,
    total_viral_posts = public.fame_leaderboard.total_viral_posts + (CASE WHEN NEW.is_viral THEN 1 ELSE 0 END),
    total_coins_earned = public.fame_leaderboard.total_coins_earned + NEW.coins_earned,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_fame_post_created
  AFTER INSERT ON public.fame_cam_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_fame_score();

-- Seed some trending categories
INSERT INTO public.trending_categories (category_name, emoji, trend_score, region) VALUES
  ('Dance', '💃', 95, 'global'),
  ('Food', '🍕', 88, 'global'),
  ('Fashion', '👗', 82, 'global'),
  ('Comedy', '😂', 90, 'global'),
  ('Fitness', '💪', 75, 'global'),
  ('Travel', '✈️', 80, 'global'),
  ('Music', '🎵', 85, 'global'),
  ('Beauty', '💄', 78, 'global'),
  ('Pets', '🐕', 92, 'global'),
  ('Gaming', '🎮', 87, 'global')
ON CONFLICT DO NOTHING;

-- Seed some challenges
INSERT INTO public.fame_cam_challenges (title, description, reward_coins, duration_seconds, difficulty, expires_at) VALUES
  ('Best Dance Move', 'Show us your best dance move in 15 seconds!', 100, 15, 'easy', now() + interval '7 days'),
  ('Food Paradise', 'Capture the most delicious-looking meal', 200, 30, 'medium', now() + interval '7 days'),
  ('Street Style', 'Show off your unique street fashion', 150, 20, 'medium', now() + interval '5 days'),
  ('Pet Moments', 'Capture your pet doing something amazing', 120, 15, 'easy', now() + interval '10 days'),
  ('Epic Sunset', 'Find and capture the perfect sunset', 180, 30, 'hard', now() + interval '3 days')
ON CONFLICT DO NOTHING;

-- Seed achievements
INSERT INTO public.fame_achievements (name, description, badge_emoji, requirement_type, requirement_value, coin_reward) VALUES
  ('First Post', 'Create your first FameCam post', '🎬', 'first_post', 1, 50),
  ('Viral Sensation', 'Get your first viral post', '🔥', 'first_viral', 1, 200),
  ('Fame Master', 'Earn 1000 fame points', '⭐', 'fame_score', 1000, 500),
  ('Challenge Champion', 'Complete 5 challenges', '🏆', 'challenges_completed', 5, 300),
  ('Coin Collector', 'Earn 500 Chatr Coins from FameCam', '🪙', 'coins_earned', 500, 100)
ON CONFLICT DO NOTHING;