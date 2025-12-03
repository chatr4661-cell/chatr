-- CHATR Games Hub - Complete Gaming System

-- Main games user progress table
CREATE TABLE public.game_user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  total_coins INTEGER DEFAULT 0,
  total_xp INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  achievements JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- 1. PARALLEL YOU - AI Doppelganger Game
CREATE TABLE public.parallel_you_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  ai_personality JSONB DEFAULT '{}', -- learned traits
  chat_patterns JSONB DEFAULT '{}', -- emoji usage, response times, topics
  evolution_level INTEGER DEFAULT 1,
  total_battles INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  last_trained_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE public.parallel_you_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  level INTEGER NOT NULL,
  challenge_type TEXT NOT NULL, -- 'speed', 'creativity', 'puzzle', 'social', 'memory'
  challenge_data JSONB NOT NULL,
  ai_response JSONB,
  user_response JSONB,
  winner TEXT, -- 'user', 'ai', 'tie'
  score INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. MAP HUNT - Real World Treasure Hunt
CREATE TABLE public.map_hunt_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  current_level INTEGER DEFAULT 1,
  total_keys_found INTEGER DEFAULT 0,
  total_treasures INTEGER DEFAULT 0,
  xp INTEGER DEFAULT 0,
  current_hunt_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE public.map_hunt_clues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  level INTEGER NOT NULL,
  clue_text TEXT NOT NULL,
  clue_type TEXT NOT NULL, -- 'visual', 'location', 'riddle', 'social'
  target_description TEXT,
  hint_1 TEXT,
  hint_2 TEXT,
  hint_3 TEXT,
  hints_used INTEGER DEFAULT 0,
  photo_url TEXT,
  verified BOOLEAN DEFAULT false,
  verification_score NUMERIC,
  coins_earned INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. EMOTIONSYNC - Emotion Detection Game
CREATE TABLE public.emotionsync_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  current_level INTEGER DEFAULT 1,
  total_challenges INTEGER DEFAULT 0,
  accuracy_rate NUMERIC DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  xp INTEGER DEFAULT 0,
  unlocked_emotions TEXT[] DEFAULT ARRAY['happy', 'sad'],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE public.emotionsync_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  level INTEGER NOT NULL,
  target_emotion TEXT NOT NULL,
  difficulty TEXT NOT NULL, -- 'easy', 'medium', 'hard', 'expert'
  input_type TEXT NOT NULL, -- 'voice', 'text', 'mixed'
  user_input TEXT,
  detected_emotion TEXT,
  confidence_score NUMERIC,
  success BOOLEAN,
  time_taken_ms INTEGER,
  coins_earned INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. ENERGY PULSE - Rhythm Game
CREATE TABLE public.energy_pulse_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  current_level INTEGER DEFAULT 1,
  high_score INTEGER DEFAULT 0,
  total_pulses INTEGER DEFAULT 0,
  perfect_hits INTEGER DEFAULT 0,
  xp INTEGER DEFAULT 0,
  unlocked_themes TEXT[] DEFAULT ARRAY['default'],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE public.energy_pulse_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  level INTEGER NOT NULL,
  bpm INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL,
  total_beats INTEGER NOT NULL,
  perfect_hits INTEGER DEFAULT 0,
  good_hits INTEGER DEFAULT 0,
  missed INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  combo_max INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  coins_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Game levels configuration (50 levels per game)
CREATE TABLE public.game_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type TEXT NOT NULL, -- 'parallel_you', 'map_hunt', 'emotionsync', 'energy_pulse'
  level_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT NOT NULL,
  xp_reward INTEGER NOT NULL,
  coin_reward INTEGER NOT NULL,
  unlock_requirement JSONB DEFAULT '{}',
  level_config JSONB NOT NULL, -- game-specific settings
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(game_type, level_number)
);

-- Leaderboards
CREATE TABLE public.game_leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  game_type TEXT NOT NULL,
  score INTEGER NOT NULL,
  level INTEGER NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.game_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parallel_you_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parallel_you_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_hunt_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_hunt_clues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emotionsync_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emotionsync_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.energy_pulse_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.energy_pulse_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_leaderboards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own game profile" ON public.game_user_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own parallel you profile" ON public.parallel_you_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own parallel you challenges" ON public.parallel_you_challenges FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own map hunt progress" ON public.map_hunt_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own map hunt clues" ON public.map_hunt_clues FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own emotionsync progress" ON public.emotionsync_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own emotionsync challenges" ON public.emotionsync_challenges FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own energy pulse progress" ON public.energy_pulse_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own energy pulse sessions" ON public.energy_pulse_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can read game levels" ON public.game_levels FOR SELECT USING (true);
CREATE POLICY "Users can read leaderboards" ON public.game_leaderboards FOR SELECT USING (true);
CREATE POLICY "Users can insert own leaderboard entries" ON public.game_leaderboards FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Seed 50 levels for each game
INSERT INTO public.game_levels (game_type, level_number, title, description, difficulty, xp_reward, coin_reward, level_config) 
SELECT 
  'parallel_you',
  n,
  CASE 
    WHEN n <= 10 THEN 'Awakening ' || n
    WHEN n <= 20 THEN 'Growing ' || (n-10)
    WHEN n <= 30 THEN 'Evolving ' || (n-20)
    WHEN n <= 40 THEN 'Mastering ' || (n-30)
    ELSE 'Transcending ' || (n-40)
  END,
  'Challenge your AI twin at level ' || n,
  CASE WHEN n <= 10 THEN 'easy' WHEN n <= 25 THEN 'medium' WHEN n <= 40 THEN 'hard' ELSE 'expert' END,
  n * 50,
  n * 10,
  jsonb_build_object(
    'challenge_types', ARRAY['speed', 'creativity', 'puzzle', 'memory', 'social'],
    'time_limit', GREATEST(60 - n, 15),
    'ai_difficulty', LEAST(0.3 + (n * 0.014), 0.95)
  )
FROM generate_series(1, 50) n;

INSERT INTO public.game_levels (game_type, level_number, title, description, difficulty, xp_reward, coin_reward, level_config)
SELECT 
  'map_hunt',
  n,
  CASE 
    WHEN n <= 10 THEN 'Explorer ' || n
    WHEN n <= 20 THEN 'Seeker ' || (n-10)
    WHEN n <= 30 THEN 'Hunter ' || (n-20)
    WHEN n <= 40 THEN 'Master ' || (n-30)
    ELSE 'Legend ' || (n-40)
  END,
  'Find the hidden treasure at level ' || n,
  CASE WHEN n <= 10 THEN 'easy' WHEN n <= 25 THEN 'medium' WHEN n <= 40 THEN 'hard' ELSE 'expert' END,
  n * 75,
  n * 15,
  jsonb_build_object(
    'clue_complexity', LEAST(1 + (n * 0.05), 3.5),
    'hints_allowed', GREATEST(3 - (n / 20), 0),
    'verification_threshold', LEAST(0.5 + (n * 0.01), 0.9)
  )
FROM generate_series(1, 50) n;

INSERT INTO public.game_levels (game_type, level_number, title, description, difficulty, xp_reward, coin_reward, level_config)
SELECT 
  'emotionsync',
  n,
  CASE 
    WHEN n <= 10 THEN 'Feeling ' || n
    WHEN n <= 20 THEN 'Sensing ' || (n-10)
    WHEN n <= 30 THEN 'Reading ' || (n-20)
    WHEN n <= 40 THEN 'Mastering ' || (n-30)
    ELSE 'Transcending ' || (n-40)
  END,
  'Master emotion detection at level ' || n,
  CASE WHEN n <= 10 THEN 'easy' WHEN n <= 25 THEN 'medium' WHEN n <= 40 THEN 'hard' ELSE 'expert' END,
  n * 60,
  n * 12,
  jsonb_build_object(
    'emotions', CASE 
      WHEN n <= 10 THEN ARRAY['happy', 'sad']
      WHEN n <= 20 THEN ARRAY['happy', 'sad', 'angry', 'surprised']
      WHEN n <= 30 THEN ARRAY['happy', 'sad', 'angry', 'surprised', 'fearful', 'disgusted']
      ELSE ARRAY['happy', 'sad', 'angry', 'surprised', 'fearful', 'disgusted', 'contempt', 'neutral']
    END,
    'time_limit', GREATEST(30 - (n / 3), 8),
    'accuracy_required', LEAST(0.5 + (n * 0.008), 0.9)
  )
FROM generate_series(1, 50) n;

INSERT INTO public.game_levels (game_type, level_number, title, description, difficulty, xp_reward, coin_reward, level_config)
SELECT 
  'energy_pulse',
  n,
  CASE 
    WHEN n <= 10 THEN 'Pulse ' || n
    WHEN n <= 20 THEN 'Wave ' || (n-10)
    WHEN n <= 30 THEN 'Flow ' || (n-20)
    WHEN n <= 40 THEN 'Storm ' || (n-30)
    ELSE 'Chaos ' || (n-40)
  END,
  'Match the rhythm at level ' || n,
  CASE WHEN n <= 10 THEN 'easy' WHEN n <= 25 THEN 'medium' WHEN n <= 40 THEN 'hard' ELSE 'expert' END,
  n * 40,
  n * 8,
  jsonb_build_object(
    'bpm', 60 + (n * 3),
    'duration', 30 + (n / 2),
    'pattern_complexity', LEAST(1 + (n * 0.06), 4),
    'perfect_window_ms', GREATEST(200 - (n * 3), 50)
  )
FROM generate_series(1, 50) n;