-- 1. Nutrition Tracking table
CREATE TABLE IF NOT EXISTS public.nutrition_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  food_name TEXT NOT NULL,
  calories INTEGER,
  protein_g NUMERIC(6,2),
  carbs_g NUMERIC(6,2),
  fat_g NUMERIC(6,2),
  fiber_g NUMERIC(6,2),
  water_ml INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Daily nutrition summary
CREATE TABLE IF NOT EXISTS public.nutrition_daily_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary_date DATE NOT NULL,
  total_calories INTEGER DEFAULT 0,
  total_protein_g NUMERIC(8,2) DEFAULT 0,
  total_carbs_g NUMERIC(8,2) DEFAULT 0,
  total_fat_g NUMERIC(8,2) DEFAULT 0,
  total_water_ml INTEGER DEFAULT 0,
  goal_calories INTEGER DEFAULT 2000,
  goal_protein_g NUMERIC(6,2) DEFAULT 50,
  goal_carbs_g NUMERIC(6,2) DEFAULT 250,
  goal_fat_g NUMERIC(6,2) DEFAULT 65,
  goal_water_ml INTEGER DEFAULT 2500,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, summary_date)
);

-- 3. Mental health providers specialization extension
ALTER TABLE public.chatr_healthcare ADD COLUMN IF NOT EXISTS is_mental_health_provider BOOLEAN DEFAULT false;
ALTER TABLE public.chatr_healthcare ADD COLUMN IF NOT EXISTS mental_health_specialties TEXT[];
ALTER TABLE public.chatr_healthcare ADD COLUMN IF NOT EXISTS offers_teletherapy BOOLEAN DEFAULT false;
ALTER TABLE public.chatr_healthcare ADD COLUMN IF NOT EXISTS therapy_modes TEXT[]; -- ['video', 'audio', 'chat', 'in-person']
ALTER TABLE public.chatr_healthcare ADD COLUMN IF NOT EXISTS languages TEXT[];

-- 4. Therapy sessions table
CREATE TABLE IF NOT EXISTS public.therapy_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('video', 'audio', 'chat', 'in-person')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 45,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in-progress', 'completed', 'cancelled', 'no-show')),
  session_notes TEXT,
  mood_before INTEGER CHECK (mood_before >= 1 AND mood_before <= 10),
  mood_after INTEGER CHECK (mood_after >= 1 AND mood_after <= 10),
  payment_status TEXT DEFAULT 'pending',
  amount NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Mental health self-assessments
CREATE TABLE IF NOT EXISTS public.mental_health_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_type TEXT NOT NULL, -- 'PHQ-9', 'GAD-7', 'mood_tracker', 'stress_level'
  score INTEGER,
  responses JSONB,
  interpretation TEXT,
  recommendations TEXT[],
  assessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. BMI records table
CREATE TABLE IF NOT EXISTS public.bmi_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  height_cm NUMERIC(5,2) NOT NULL,
  weight_kg NUMERIC(5,2) NOT NULL,
  bmi_value NUMERIC(4,2) NOT NULL,
  bmi_category TEXT NOT NULL, -- 'underweight', 'normal', 'overweight', 'obese'
  waist_cm NUMERIC(5,2),
  body_fat_percent NUMERIC(4,2),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Health reminders table
CREATE TABLE IF NOT EXISTS public.health_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL, -- 'medication', 'appointment', 'lab_test', 'vaccination', 'checkup'
  title TEXT NOT NULL,
  description TEXT,
  reminder_time TIMESTAMPTZ NOT NULL,
  repeat_pattern TEXT, -- 'daily', 'weekly', 'monthly', 'yearly', 'once'
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  reference_id UUID, -- Link to medication_id, appointment_id, etc.
  reference_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Insurance pre-authorization requests
CREATE TABLE IF NOT EXISTS public.insurance_preauth (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insurance_provider TEXT NOT NULL,
  policy_number TEXT NOT NULL,
  provider_id UUID,
  procedure_code TEXT,
  procedure_name TEXT NOT NULL,
  estimated_cost NUMERIC(12,2),
  preauth_status TEXT DEFAULT 'pending' CHECK (preauth_status IN ('pending', 'approved', 'denied', 'expired')),
  preauth_number TEXT,
  approved_amount NUMERIC(12,2),
  valid_until DATE,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  notes TEXT,
  documents JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_daily_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.therapy_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mental_health_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bmi_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_preauth ENABLE ROW LEVEL SECURITY;

-- RLS Policies for nutrition_logs
CREATE POLICY "Users can view their own nutrition logs" ON public.nutrition_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own nutrition logs" ON public.nutrition_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own nutrition logs" ON public.nutrition_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own nutrition logs" ON public.nutrition_logs FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for nutrition_daily_summary
CREATE POLICY "Users can view their own nutrition summary" ON public.nutrition_daily_summary FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own nutrition summary" ON public.nutrition_daily_summary FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own nutrition summary" ON public.nutrition_daily_summary FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for therapy_sessions
CREATE POLICY "Users can view their own therapy sessions" ON public.therapy_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own therapy sessions" ON public.therapy_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own therapy sessions" ON public.therapy_sessions FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for mental_health_assessments
CREATE POLICY "Users can view their own assessments" ON public.mental_health_assessments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own assessments" ON public.mental_health_assessments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for bmi_records
CREATE POLICY "Users can view their own BMI records" ON public.bmi_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own BMI records" ON public.bmi_records FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own BMI records" ON public.bmi_records FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for health_reminders
CREATE POLICY "Users can view their own reminders" ON public.health_reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own reminders" ON public.health_reminders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reminders" ON public.health_reminders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reminders" ON public.health_reminders FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for insurance_preauth
CREATE POLICY "Users can view their own preauth requests" ON public.insurance_preauth FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own preauth requests" ON public.insurance_preauth FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own preauth requests" ON public.insurance_preauth FOR UPDATE USING (auth.uid() = user_id);

-- Function to calculate and store BMI
CREATE OR REPLACE FUNCTION public.calculate_bmi(p_height_cm NUMERIC, p_weight_kg NUMERIC)
RETURNS TABLE(bmi_value NUMERIC, bmi_category TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bmi NUMERIC(4,2);
  v_category TEXT;
  v_height_m NUMERIC;
BEGIN
  v_height_m := p_height_cm / 100;
  v_bmi := ROUND(p_weight_kg / (v_height_m * v_height_m), 2);
  
  v_category := CASE
    WHEN v_bmi < 18.5 THEN 'underweight'
    WHEN v_bmi >= 18.5 AND v_bmi < 25 THEN 'normal'
    WHEN v_bmi >= 25 AND v_bmi < 30 THEN 'overweight'
    ELSE 'obese'
  END;
  
  RETURN QUERY SELECT v_bmi, v_category;
END;
$$;

-- Function to update daily nutrition summary
CREATE OR REPLACE FUNCTION public.update_nutrition_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.nutrition_daily_summary (user_id, summary_date, total_calories, total_protein_g, total_carbs_g, total_fat_g, total_water_ml)
  SELECT 
    NEW.user_id,
    NEW.log_date,
    COALESCE(SUM(calories), 0),
    COALESCE(SUM(protein_g), 0),
    COALESCE(SUM(carbs_g), 0),
    COALESCE(SUM(fat_g), 0),
    COALESCE(SUM(water_ml), 0)
  FROM public.nutrition_logs
  WHERE user_id = NEW.user_id AND log_date = NEW.log_date
  ON CONFLICT (user_id, summary_date)
  DO UPDATE SET
    total_calories = EXCLUDED.total_calories,
    total_protein_g = EXCLUDED.total_protein_g,
    total_carbs_g = EXCLUDED.total_carbs_g,
    total_fat_g = EXCLUDED.total_fat_g,
    total_water_ml = EXCLUDED.total_water_ml;
  
  RETURN NEW;
END;
$$;

-- Trigger for nutrition summary updates
CREATE TRIGGER update_nutrition_summary_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.nutrition_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_nutrition_summary();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_user_date ON public.nutrition_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_therapy_sessions_user ON public.therapy_sessions(user_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_mental_health_assessments_user ON public.mental_health_assessments(user_id, assessed_at);
CREATE INDEX IF NOT EXISTS idx_bmi_records_user ON public.bmi_records(user_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_health_reminders_user_active ON public.health_reminders(user_id, is_active, reminder_time);
CREATE INDEX IF NOT EXISTS idx_chatr_healthcare_mental ON public.chatr_healthcare(is_mental_health_provider) WHERE is_mental_health_provider = true;