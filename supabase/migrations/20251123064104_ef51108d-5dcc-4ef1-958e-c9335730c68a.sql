-- Health Vitals & Wellness Tracking (New Table)
CREATE TABLE IF NOT EXISTS public.health_vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vital_type TEXT NOT NULL CHECK (vital_type IN ('heart_rate', 'blood_pressure', 'steps', 'sleep', 'weight', 'temperature', 'oxygen_saturation', 'glucose')),
  value JSONB NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'apple_health', 'google_fit', 'device')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_vitals_user_type ON public.health_vitals(user_id, vital_type, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_vitals_recorded ON public.health_vitals(recorded_at DESC);

ALTER TABLE public.health_vitals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vitals"
  ON public.health_vitals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vitals"
  ON public.health_vitals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vitals"
  ON public.health_vitals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vitals"
  ON public.health_vitals FOR DELETE
  USING (auth.uid() = user_id);

-- Health Wallet Transactions (New Table)
CREATE TABLE IF NOT EXISTS public.health_wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.health_wallet(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit', 'debit', 'reward', 'refund', 'insurance_claim')),
  amount NUMERIC(10,2) NOT NULL,
  balance_after NUMERIC(10,2) NOT NULL,
  description TEXT NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_wallet_trans_user ON public.health_wallet_transactions(user_id, created_at DESC);

ALTER TABLE public.health_wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own health wallet transactions"
  ON public.health_wallet_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Medical ID (New Table)
CREATE TABLE IF NOT EXISTS public.medical_id (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  blood_type TEXT,
  allergies TEXT[],
  medical_conditions TEXT[],
  medications TEXT[],
  organ_donor BOOLEAN DEFAULT false,
  emergency_notes TEXT,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  date_of_birth DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.medical_id ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own medical ID"
  ON public.medical_id FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Medications (New Table)
CREATE TABLE IF NOT EXISTS public.medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  prescribed_by TEXT,
  purpose TEXT,
  side_effects TEXT[],
  instructions TEXT,
  refill_reminder_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medications_user ON public.medications(user_id, is_active, start_date DESC);

ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own medications"
  ON public.medications FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Medication Interactions (New Table)
CREATE TABLE IF NOT EXISTS public.medication_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_1 TEXT NOT NULL,
  medication_2 TEXT NOT NULL,
  interaction_severity TEXT NOT NULL CHECK (interaction_severity IN ('minor', 'moderate', 'severe')),
  description TEXT NOT NULL,
  recommendation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_med_interactions ON public.medication_interactions(medication_1, medication_2);

ALTER TABLE public.medication_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view medication interactions"
  ON public.medication_interactions FOR SELECT
  USING (true);

-- Health Challenge Participants (New Table)
CREATE TABLE IF NOT EXISTS public.health_challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.health_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_progress NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(challenge_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_participants ON public.health_challenge_participants(challenge_id, user_id, status);

ALTER TABLE public.health_challenge_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view challenge participants"
  ON public.health_challenge_participants FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own challenge participation"
  ON public.health_challenge_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own challenge participation"
  ON public.health_challenge_participants FOR UPDATE
  USING (auth.uid() = user_id);

-- Teleconsultation Bookings (New Table)
CREATE TABLE IF NOT EXISTS public.teleconsultation_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES auth.users(id),
  appointment_date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  consultation_type TEXT DEFAULT 'video' CHECK (consultation_type IN ('video', 'audio', 'chat')),
  reason TEXT NOT NULL,
  symptoms TEXT[],
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  meeting_link TEXT,
  prescription_id UUID,
  notes TEXT,
  payment_amount NUMERIC(10,2),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teleconsult_user ON public.teleconsultation_bookings(user_id, appointment_date DESC);
CREATE INDEX IF NOT EXISTS idx_teleconsult_doctor ON public.teleconsultation_bookings(doctor_id, appointment_date DESC);

ALTER TABLE public.teleconsultation_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own teleconsultations"
  ON public.teleconsultation_bookings FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = doctor_id);

CREATE POLICY "Users can create own teleconsultations"
  ON public.teleconsultation_bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own teleconsultations"
  ON public.teleconsultation_bookings FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = doctor_id);

-- Health Predictions & Analytics (New Table)
CREATE TABLE IF NOT EXISTS public.health_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prediction_type TEXT NOT NULL CHECK (prediction_type IN ('risk_assessment', 'trend_analysis', 'recommendation')),
  category TEXT NOT NULL,
  prediction_data JSONB NOT NULL,
  confidence_score NUMERIC(3,2),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_viewed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_predictions_user ON public.health_predictions(user_id, generated_at DESC);

ALTER TABLE public.health_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own health predictions"
  ON public.health_predictions FOR SELECT
  USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_health_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_medical_id_updated_at
  BEFORE UPDATE ON public.medical_id
  FOR EACH ROW EXECUTE FUNCTION update_health_updated_at();

CREATE TRIGGER update_medications_updated_at
  BEFORE UPDATE ON public.medications
  FOR EACH ROW EXECUTE FUNCTION update_health_updated_at();

CREATE TRIGGER update_teleconsult_updated_at
  BEFORE UPDATE ON public.teleconsultation_bookings
  FOR EACH ROW EXECUTE FUNCTION update_health_updated_at();