-- Health Wallet tables
CREATE TABLE IF NOT EXISTS public.health_wallet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(10,2) DEFAULT 0,
  total_earned DECIMAL(10,2) DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  insurance_provider TEXT,
  insurance_number TEXT,
  insurance_expiry DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earn', 'spend', 'refund', 'insurance_claim')),
  category TEXT, -- medication, consultation, challenge_reward, etc.
  description TEXT,
  reference_id UUID, -- Link to appointment, challenge, etc.
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Health Challenges tables
CREATE TABLE IF NOT EXISTS public.health_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL, -- steps, hydration, sleep, etc.
  target_value INTEGER NOT NULL,
  reward_points INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  participant_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.health_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

-- Symptom Checker tables
CREATE TABLE IF NOT EXISTS public.symptom_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symptoms JSONB NOT NULL,
  ai_assessment TEXT,
  severity_level TEXT CHECK (severity_level IN ('low', 'medium', 'high', 'emergency')),
  recommended_actions JSONB,
  specialist_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Expert Live Sessions tables
CREATE TABLE IF NOT EXISTS public.expert_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  expert_name TEXT NOT NULL,
  expert_title TEXT NOT NULL,
  session_title TEXT NOT NULL,
  description TEXT,
  session_date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  max_participants INTEGER DEFAULT 100,
  participant_count INTEGER DEFAULT 0,
  is_live BOOLEAN DEFAULT false,
  recording_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.expert_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, user_id)
);

-- Community Leaderboard (reuse existing points system)
CREATE TABLE IF NOT EXISTS public.leaderboard_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_points INTEGER DEFAULT 0,
  challenges_completed INTEGER DEFAULT 0,
  rank INTEGER,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Teleconsultation slots
CREATE TABLE IF NOT EXISTS public.teleconsultation_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  is_available BOOLEAN DEFAULT true,
  booked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.appointments(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.health_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symptom_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expert_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teleconsultation_slots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own wallet"
  ON public.health_wallet FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet"
  ON public.health_wallet FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their transactions"
  ON public.wallet_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view active challenges"
  ON public.health_challenges FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can join challenges"
  ON public.challenge_participants FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their symptom checks"
  ON public.symptom_checks FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view expert sessions"
  ON public.expert_sessions FOR SELECT
  USING (true);

CREATE POLICY "Users can register for sessions"
  ON public.session_participants FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view leaderboard"
  ON public.leaderboard_cache FOR SELECT
  USING (true);

CREATE POLICY "Providers can manage their slots"
  ON public.teleconsultation_slots FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.service_providers
    WHERE service_providers.id = teleconsultation_slots.provider_id
    AND service_providers.user_id = auth.uid()
  ));

CREATE POLICY "Users can view available slots"
  ON public.teleconsultation_slots FOR SELECT
  USING (is_available = true OR booked_by = auth.uid());

-- Insert sample challenges
INSERT INTO public.health_challenges (name, description, challenge_type, target_value, reward_points, start_date, end_date, participant_count)
VALUES
  ('10K Steps Challenge', 'Walk 10,000 steps daily for a week', 'steps', 70000, 100, CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 1234),
  ('Hydration Week', 'Drink 8 glasses of water daily', 'hydration', 56, 50, CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 856),
  ('Sleep Quality', 'Get 7-8 hours of quality sleep', 'sleep', 7, 75, CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 632)
ON CONFLICT DO NOTHING;

-- Insert sample expert sessions
INSERT INTO public.expert_sessions (expert_name, expert_title, session_title, description, session_date, participant_count, is_live)
VALUES
  ('Dr. Sarah Johnson', 'Nutritionist', 'Nutrition for Better Sleep', 'Learn how diet affects your sleep quality', now() + INTERVAL '2 hours', 234, true),
  ('Dr. Michael Chen', 'Therapist', 'Mental Health & Mindfulness', 'Practical mindfulness techniques for daily life', now() + INTERVAL '1 day', 156, false)
ON CONFLICT DO NOTHING;