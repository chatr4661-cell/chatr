-- Add daily challenges table for games (with nullable game_type for global challenges)
CREATE TABLE IF NOT EXISTS public.game_daily_challenges (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    game_type TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    challenge_type TEXT NOT NULL DEFAULT 'daily',
    target_value INTEGER NOT NULL DEFAULT 1,
    coin_reward INTEGER NOT NULL DEFAULT 50,
    xp_reward INTEGER NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add game achievements table
CREATE TABLE IF NOT EXISTS public.game_achievements (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    game_type TEXT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT,
    coin_reward INTEGER NOT NULL DEFAULT 100,
    xp_reward INTEGER NOT NULL DEFAULT 200,
    requirement_type TEXT NOT NULL,
    requirement_value INTEGER NOT NULL DEFAULT 1,
    rarity TEXT NOT NULL DEFAULT 'common',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add user achievements tracking
CREATE TABLE IF NOT EXISTS public.game_user_achievements (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    achievement_id UUID NOT NULL REFERENCES public.game_achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, achievement_id)
);

-- Enable RLS
ALTER TABLE public.game_daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily challenges (public read)
CREATE POLICY "Anyone can view daily challenges" ON public.game_daily_challenges
    FOR SELECT USING (true);

-- RLS Policies for achievements (public read)
CREATE POLICY "Anyone can view achievements" ON public.game_achievements
    FOR SELECT USING (true);

-- RLS Policies for user achievements
CREATE POLICY "Users can view their own achievements" ON public.game_user_achievements
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can unlock their own achievements" ON public.game_user_achievements
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Insert default achievements
INSERT INTO public.game_achievements (game_type, name, description, icon, coin_reward, xp_reward, requirement_type, requirement_value, rarity) VALUES
-- General achievements
(NULL, 'First Steps', 'Complete your first game level', '🎮', 50, 100, 'levels_completed', 1, 'common'),
(NULL, 'Rising Star', 'Complete 10 levels in any game', '⭐', 100, 200, 'levels_completed', 10, 'common'),
(NULL, 'Game Master', 'Complete 50 levels across all games', '👑', 500, 1000, 'levels_completed', 50, 'rare'),
(NULL, 'Legend', 'Complete 100 levels across all games', '🏆', 1000, 2000, 'levels_completed', 100, 'epic'),
(NULL, 'Daily Player', 'Play games 7 days in a row', '📅', 200, 400, 'streak_days', 7, 'common'),
(NULL, 'Dedicated', 'Play games 30 days in a row', '🔥', 500, 1000, 'streak_days', 30, 'rare'),
(NULL, 'Unstoppable', 'Play games 100 days in a row', '💎', 2000, 5000, 'streak_days', 100, 'legendary'),

-- Parallel You achievements
('parallel_you', 'Mirror Match Beginner', 'Complete 10 MirrorMatch levels', '🪞', 100, 200, 'game_levels', 10, 'common'),
('parallel_you', 'Twin Master', 'Complete 50 MirrorMatch levels', '👯', 500, 1000, 'game_levels', 50, 'rare'),
('parallel_you', 'The Singularity', 'Complete all 75 MirrorMatch levels', '🌌', 2500, 5000, 'game_levels', 75, 'legendary'),

-- EmotionSync achievements
('emotionsync', 'Emotion Reader', 'Complete 10 SyncMind levels', '😊', 100, 200, 'game_levels', 10, 'common'),
('emotionsync', 'Empathy Expert', 'Complete 50 SyncMind levels', '💖', 500, 1000, 'game_levels', 50, 'rare'),
('emotionsync', 'The Empath', 'Complete all 75 SyncMind levels', '🧠', 2500, 5000, 'game_levels', 75, 'legendary'),

-- Energy Pulse achievements
('energy_pulse', 'Pattern Finder', 'Complete 10 EchoChain levels', '🔮', 100, 200, 'game_levels', 10, 'common'),
('energy_pulse', 'Rhythm Master', 'Complete 50 EchoChain levels', '🎵', 500, 1000, 'game_levels', 50, 'rare'),
('energy_pulse', 'Infinite Echo', 'Complete all 75 EchoChain levels', '♾️', 2500, 5000, 'game_levels', 75, 'legendary'),

-- Map Hunt achievements
('map_hunt', 'Explorer', 'Complete 10 AIAirRunner levels', '🗺️', 100, 200, 'game_levels', 10, 'common'),
('map_hunt', 'Pathfinder', 'Complete 50 AIAirRunner levels', '🧭', 500, 1000, 'game_levels', 50, 'rare'),
('map_hunt', 'The Everywhere', 'Complete all 75 AIAirRunner levels', '🌍', 2500, 5000, 'game_levels', 75, 'legendary');

-- Insert sample daily challenges
INSERT INTO public.game_daily_challenges (game_type, title, description, challenge_type, target_value, coin_reward, xp_reward, expires_at) VALUES
('parallel_you', 'Daily Twin Challenge', 'Complete 3 MirrorMatch levels today', 'daily', 3, 100, 200, now() + interval '1 day'),
('emotionsync', 'Emotion Express', 'Score 1000 points in SyncMind', 'daily', 1000, 100, 200, now() + interval '1 day'),
('energy_pulse', 'Pattern Streak', 'Complete 5 EchoChain levels without mistakes', 'daily', 5, 150, 300, now() + interval '1 day'),
('map_hunt', 'Distance Runner', 'Cover 2km in AIAirRunner', 'daily', 2000, 150, 300, now() + interval '1 day'),
('all', 'All-Rounder', 'Play all 4 game types today', 'daily', 4, 200, 400, now() + interval '1 day');