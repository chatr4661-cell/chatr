-- Phase 8: Database Schema Updates

-- 1. Create point_earning_rules table
CREATE TABLE public.point_earning_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type TEXT NOT NULL,
  points_awarded INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  max_daily_claims INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default earning rules
INSERT INTO public.point_earning_rules (rule_type, points_awarded, description, max_daily_claims) VALUES
('daily_login', 10, 'Daily login bonus', 1),
('login_streak_5', 25, '5-day login streak bonus', 1),
('messaging_10', 1, '1 point per 10 messages sent', NULL),
('health_profile_complete', 100, 'Complete health profile', 1),
('lab_report_upload', 20, 'Upload lab report', 5),
('medication_reminder_set', 15, 'Set medication reminder', 3),
('health_checkup_attended', 50, 'Attend health checkup', NULL),
('referral_success', 200, 'Successful referral', NULL),
('survey_participation', 50, 'Complete health survey', 3),
('appointment_booking', 25, 'Book appointment cashback', NULL),
('treatment_complete', 50, 'Complete treatment plan', NULL),
('provider_review', 20, 'Review a provider', NULL);

-- 2. Create user_streaks table
CREATE TABLE public.user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_login_date DATE,
  total_logins INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- 3. Create referral_rewards table
CREATE TABLE public.referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  points_awarded INTEGER DEFAULT 200,
  status TEXT DEFAULT 'pending',
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(referrer_id, referred_user_id)
);

-- 4. Create qr_payments table
CREATE TABLE public.qr_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_points INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,
  qr_token TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 5. Create point_settlements table
CREATE TABLE public.point_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  points_earned INTEGER NOT NULL,
  inr_amount NUMERIC(10,2) NOT NULL,
  settlement_status TEXT DEFAULT 'pending',
  settlement_date TIMESTAMP WITH TIME ZONE,
  payment_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Modify profiles table - add QR and streak fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS qr_code_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS streak_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Generate unique referral codes for existing users
UPDATE public.profiles 
SET referral_code = 'CHATR' || substring(id::text from 1 for 6)
WHERE referral_code IS NULL;

-- Generate QR tokens for existing users
UPDATE public.profiles
SET qr_code_token = encode(gen_random_bytes(16), 'hex')
WHERE qr_code_token IS NULL;

-- 7. Modify appointments table - add point payment fields
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash',
ADD COLUMN IF NOT EXISTS points_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cash_amount NUMERIC(10,2) DEFAULT 0;

-- 8. Modify services table - add point pricing
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS price_points INTEGER,
ADD COLUMN IF NOT EXISTS point_discount_percentage INTEGER DEFAULT 0;

-- Update existing services with point prices (1 point = 1 INR)
UPDATE public.services
SET price_points = price::INTEGER
WHERE price_points IS NULL AND price IS NOT NULL;

-- 9. Modify payments table - add points tracking
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS points_amount INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'cash';

-- Enable RLS on new tables
ALTER TABLE public.point_earning_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_settlements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for point_earning_rules
CREATE POLICY "Anyone can view active earning rules"
ON public.point_earning_rules FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage earning rules"
ON public.point_earning_rules FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for user_streaks
CREATE POLICY "Users can view their own streaks"
ON public.user_streaks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own streaks"
ON public.user_streaks FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streaks"
ON public.user_streaks FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for referral_rewards
CREATE POLICY "Users can view their referrals"
ON public.referral_rewards FOR SELECT
USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);

CREATE POLICY "Users can create referrals"
ON public.referral_rewards FOR INSERT
WITH CHECK (auth.uid() = referrer_id);

-- RLS Policies for qr_payments
CREATE POLICY "Users can view their QR payments"
ON public.qr_payments FOR SELECT
USING (auth.uid() = payer_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create QR payments"
ON public.qr_payments FOR INSERT
WITH CHECK (auth.uid() = payer_id);

CREATE POLICY "Users can update their QR payments"
ON public.qr_payments FOR UPDATE
USING (auth.uid() = payer_id OR auth.uid() = receiver_id);

-- RLS Policies for point_settlements
CREATE POLICY "Providers can view their settlements"
ON public.point_settlements FOR SELECT
USING (EXISTS (
  SELECT 1 FROM service_providers
  WHERE service_providers.id = point_settlements.provider_id
  AND service_providers.user_id = auth.uid()
));

CREATE POLICY "Admins can manage settlements"
ON public.point_settlements FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create triggers for updated_at
CREATE TRIGGER update_point_earning_rules_updated_at
BEFORE UPDATE ON public.point_earning_rules
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_streaks_updated_at
BEFORE UPDATE ON public.user_streaks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_point_settlements_updated_at
BEFORE UPDATE ON public.point_settlements
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_user_streaks_user_id ON public.user_streaks(user_id);
CREATE INDEX idx_referral_rewards_referrer ON public.referral_rewards(referrer_id);
CREATE INDEX idx_referral_rewards_referred ON public.referral_rewards(referred_user_id);
CREATE INDEX idx_qr_payments_payer ON public.qr_payments(payer_id);
CREATE INDEX idx_qr_payments_receiver ON public.qr_payments(receiver_id);
CREATE INDEX idx_qr_payments_status ON public.qr_payments(status);
CREATE INDEX idx_point_settlements_provider ON public.point_settlements(provider_id);
CREATE INDEX idx_profiles_qr_token ON public.profiles(qr_code_token);
CREATE INDEX idx_profiles_referral_code ON public.profiles(referral_code);