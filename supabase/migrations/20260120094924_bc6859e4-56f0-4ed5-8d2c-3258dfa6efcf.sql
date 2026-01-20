-- =====================================================
-- CHATR MICRO-TASK ENGINE v1 (Earning Engine)
-- Using simpler admin check without role column
-- =====================================================

-- 1. MICRO_TASKS TABLE - Core earning task definitions
CREATE TABLE public.micro_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type TEXT NOT NULL CHECK (task_type IN ('audio_listen', 'photo_verify', 'rate_service')),
  title TEXT NOT NULL,
  description TEXT,
  reward_coins INTEGER NOT NULL DEFAULT 50,
  reward_rupees NUMERIC(10,2) NOT NULL DEFAULT 5.00,
  
  -- Audio-specific
  audio_url TEXT,
  audio_duration_seconds INTEGER,
  verification_question TEXT,
  verification_options JSONB,
  correct_option_index INTEGER,
  
  -- Geo-targeting
  geo_required BOOLEAN DEFAULT false,
  geo_lat NUMERIC(10,7),
  geo_lng NUMERIC(10,7),
  geo_radius_km NUMERIC(5,2) DEFAULT 5.00,
  
  -- Limits
  max_completions INTEGER DEFAULT 100,
  current_completions INTEGER DEFAULT 0,
  max_per_user INTEGER DEFAULT 1,
  expires_at TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. MICRO_TASK_ASSIGNMENTS TABLE - User task claims
CREATE TABLE public.micro_task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.micro_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'submitted', 'completed', 'expired', 'rejected')),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 minutes'),
  completed_at TIMESTAMPTZ,
  UNIQUE(task_id, user_id)
);

-- 3. MICRO_TASK_SUBMISSIONS TABLE - User submissions
CREATE TABLE public.micro_task_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.micro_task_assignments(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.micro_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Audio listen data
  audio_listened_percent INTEGER,
  selected_option_index INTEGER,
  
  -- Photo verify data
  media_url TEXT,
  media_hash TEXT,
  
  -- Rate service data
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  voice_note_url TEXT,
  
  -- GPS data
  submitted_lat NUMERIC(10,7),
  submitted_lng NUMERIC(10,7),
  gps_distance_km NUMERIC(5,2),
  
  -- Device fingerprint
  device_hash TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'auto_approved', 'auto_rejected', 'manual_review', 'approved', 'rejected')),
  rejection_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. MICRO_TASK_VERIFICATIONS TABLE - Verification records
CREATE TABLE public.micro_task_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.micro_task_submissions(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL CHECK (verification_type IN ('auto', 'manual')),
  verified_by UUID,
  result TEXT NOT NULL CHECK (result IN ('approved', 'rejected')),
  reason TEXT,
  coins_awarded INTEGER,
  rupees_awarded NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. MICRO_TASK_FRAUD_FLAGS TABLE - Fraud detection
CREATE TABLE public.micro_task_fraud_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  submission_id UUID REFERENCES public.micro_task_submissions(id) ON DELETE SET NULL,
  flag_type TEXT NOT NULL CHECK (flag_type IN ('rate_limit', 'gps_mismatch', 'photo_duplicate', 'audio_incomplete', 'device_abuse')),
  details JSONB,
  risk_score_delta INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. MICRO_TASK_USER_SCORES TABLE - Aggregated fraud scores and earnings
CREATE TABLE public.micro_task_user_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  risk_score INTEGER DEFAULT 0,
  is_soft_blocked BOOLEAN DEFAULT false,
  total_flags INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  total_earned_coins INTEGER DEFAULT 0,
  total_earned_rupees NUMERIC(10,2) DEFAULT 0,
  last_flag_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. MICRO_TASK_ADMINS TABLE - Admin users for task management
CREATE TABLE public.micro_task_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_micro_tasks_active ON public.micro_tasks(is_active, expires_at) WHERE is_active = true;
CREATE INDEX idx_micro_tasks_type ON public.micro_tasks(task_type);
CREATE INDEX idx_micro_task_assignments_user ON public.micro_task_assignments(user_id, status);
CREATE INDEX idx_micro_task_assignments_task ON public.micro_task_assignments(task_id, status);
CREATE INDEX idx_micro_task_submissions_status ON public.micro_task_submissions(status);
CREATE INDEX idx_micro_task_submissions_user ON public.micro_task_submissions(user_id);
CREATE INDEX idx_micro_task_fraud_flags_user ON public.micro_task_fraud_flags(user_id);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.micro_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_task_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_task_fraud_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_task_user_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_task_admins ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_micro_task_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.micro_task_admins WHERE user_id = check_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- MICRO_TASKS: Anyone authenticated can view active tasks
CREATE POLICY "view_active_micro_tasks" ON public.micro_tasks 
  FOR SELECT TO authenticated
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()) AND current_completions < max_completions);

CREATE POLICY "admin_manage_micro_tasks" ON public.micro_tasks 
  FOR ALL TO authenticated
  USING (public.is_micro_task_admin(auth.uid()));

-- MICRO_TASK_ASSIGNMENTS: Users see and manage their own
CREATE POLICY "view_own_assignments" ON public.micro_task_assignments 
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "create_own_assignments" ON public.micro_task_assignments 
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "update_own_assignments" ON public.micro_task_assignments 
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "admin_manage_assignments" ON public.micro_task_assignments 
  FOR ALL TO authenticated
  USING (public.is_micro_task_admin(auth.uid()));

-- MICRO_TASK_SUBMISSIONS: Users see their own, admins see all
CREATE POLICY "view_own_submissions" ON public.micro_task_submissions 
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "create_own_submissions" ON public.micro_task_submissions 
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin_manage_submissions" ON public.micro_task_submissions 
  FOR ALL TO authenticated
  USING (public.is_micro_task_admin(auth.uid()));

-- MICRO_TASK_VERIFICATIONS: Admins only
CREATE POLICY "admin_manage_verifications" ON public.micro_task_verifications 
  FOR ALL TO authenticated
  USING (public.is_micro_task_admin(auth.uid()));

-- MICRO_TASK_FRAUD_FLAGS: Admins view, system insert
CREATE POLICY "admin_view_fraud_flags" ON public.micro_task_fraud_flags 
  FOR SELECT TO authenticated
  USING (public.is_micro_task_admin(auth.uid()));

CREATE POLICY "insert_fraud_flags" ON public.micro_task_fraud_flags 
  FOR INSERT TO authenticated WITH CHECK (true);

-- MICRO_TASK_USER_SCORES: Users see own, admins see all, system can upsert
CREATE POLICY "view_own_score" ON public.micro_task_user_scores 
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_micro_task_admin(auth.uid()));

CREATE POLICY "system_upsert_scores" ON public.micro_task_user_scores 
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "system_update_scores" ON public.micro_task_user_scores 
  FOR UPDATE TO authenticated USING (true);

-- MICRO_TASK_ADMINS: Only admins can view
CREATE POLICY "admin_view_admins" ON public.micro_task_admins 
  FOR SELECT TO authenticated
  USING (public.is_micro_task_admin(auth.uid()) OR user_id = auth.uid());

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Haversine distance function
CREATE OR REPLACE FUNCTION public.haversine_distance_km(
  lat1 NUMERIC, lng1 NUMERIC,
  lat2 NUMERIC, lng2 NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
  R CONSTANT NUMERIC := 6371;
  dlat NUMERIC;
  dlng NUMERIC;
  a NUMERIC;
  c NUMERIC;
BEGIN
  IF lat1 IS NULL OR lng1 IS NULL OR lat2 IS NULL OR lng2 IS NULL THEN
    RETURN NULL;
  END IF;
  dlat := radians(lat2 - lat1);
  dlng := radians(lng2 - lng1);
  a := sin(dlat/2) * sin(dlat/2) + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng/2) * sin(dlng/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  RETURN ROUND((R * c)::NUMERIC, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update task completion count trigger
CREATE OR REPLACE FUNCTION public.update_micro_task_completion_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    UPDATE public.micro_tasks 
    SET current_completions = current_completions + 1, updated_at = now()
    WHERE id = NEW.task_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_micro_task_completion_count
  AFTER INSERT OR UPDATE ON public.micro_task_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_micro_task_completion_count();

-- Update user fraud score trigger
CREATE OR REPLACE FUNCTION public.update_micro_task_fraud_score()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.micro_task_user_scores (user_id, risk_score, total_flags, last_flag_at)
  VALUES (NEW.user_id, NEW.risk_score_delta, 1, now())
  ON CONFLICT (user_id) DO UPDATE SET
    risk_score = micro_task_user_scores.risk_score + NEW.risk_score_delta,
    total_flags = micro_task_user_scores.total_flags + 1,
    last_flag_at = now(),
    is_soft_blocked = (micro_task_user_scores.risk_score + NEW.risk_score_delta) >= 30,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_micro_task_fraud_score
  AFTER INSERT ON public.micro_task_fraud_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_micro_task_fraud_score();

-- =====================================================
-- SEED DATA - Initial Tasks
-- =====================================================

INSERT INTO public.micro_tasks (
  task_type, title, description, reward_coins, reward_rupees,
  audio_url, audio_duration_seconds, verification_question, verification_options, correct_option_index,
  geo_required, max_completions, max_per_user
) VALUES 
(
  'audio_listen',
  'Listen to hostel lunch offer',
  'Listen to a 30-second audio about today''s special lunch offer and answer a quick question.',
  50, 5.00,
  '/audio/sample-ad.mp3', 30,
  'What was the special dish mentioned?',
  '["Paneer Butter Masala", "Dal Makhani", "Chole Bhature", "Rajma Chawal"]'::jsonb,
  0,
  false, 500, 1
),
(
  'audio_listen',
  'Gym membership offer - listen & earn',
  'Listen to this 25-second gym offer and answer correctly to earn ₹10!',
  100, 10.00,
  '/audio/gym-offer.mp3', 25,
  'What discount was mentioned?',
  '["20% off", "50% off", "Free first month", "Buy 1 Get 1"]'::jsonb,
  2,
  false, 300, 1
);

INSERT INTO public.micro_tasks (
  task_type, title, description, reward_coins, reward_rupees,
  geo_required, geo_lat, geo_lng, geo_radius_km,
  max_completions, max_per_user
) VALUES 
(
  'photo_verify',
  'Upload photo of today''s menu board',
  'Take a clear photo of the menu board at your nearest canteen or dhaba. Must be taken today with GPS enabled.',
  150, 15.00,
  true, 28.6139, 77.2090, 2.00,
  100, 1
),
(
  'photo_verify',
  'Capture hostel notice board',
  'Take a photo of your hostel''s notice board. Help other students stay updated!',
  200, 20.00,
  true, 28.5500, 77.2500, 2.00,
  50, 1
);

INSERT INTO public.micro_tasks (
  task_type, title, description, reward_coins, reward_rupees,
  geo_required, geo_lat, geo_lng, geo_radius_km,
  max_completions, max_per_user
) VALUES 
(
  'rate_service',
  'Rate nearby tea stall',
  'Visit and rate the tea stall near you. Share your honest experience with a 1-5 rating!',
  50, 5.00,
  true, 28.6139, 77.2090, 5.00,
  200, 1
),
(
  'rate_service',
  'Rate your mess food today',
  'How was today''s lunch? Rate your hostel mess from 1-5 and optionally leave a voice note.',
  100, 10.00,
  true, 28.5500, 77.2500, 5.00,
  500, 1
);