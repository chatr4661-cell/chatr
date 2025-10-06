-- Create vaccination_records table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.vaccination_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vaccine_name TEXT NOT NULL,
  dose_number INTEGER NOT NULL DEFAULT 1,
  date_administered DATE NOT NULL,
  next_dose_date DATE,
  administered_by TEXT,
  certificate_url TEXT,
  batch_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vaccination_records ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their vaccination records"
  ON public.vaccination_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create vaccination records"
  ON public.vaccination_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their vaccination records"
  ON public.vaccination_records FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their vaccination records"
  ON public.vaccination_records FOR DELETE
  USING (auth.uid() = user_id);

-- Create wellness_tracking table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.wellness_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  steps INTEGER,
  water_intake INTEGER,
  sleep_hours NUMERIC(4,2),
  weight NUMERIC(5,2),
  blood_pressure_systolic INTEGER,
  blood_pressure_diastolic INTEGER,
  heart_rate INTEGER,
  mood TEXT,
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
  exercise_minutes INTEGER,
  calories NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.wellness_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their wellness data"
  ON public.wellness_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create wellness data"
  ON public.wellness_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their wellness data"
  ON public.wellness_tracking FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their wellness data"
  ON public.wellness_tracking FOR DELETE
  USING (auth.uid() = user_id);

-- Create health_goals table for goal tracking
CREATE TABLE IF NOT EXISTS public.health_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL,
  goal_name TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  current_value NUMERIC DEFAULT 0,
  unit TEXT NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  target_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.health_goals ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their health goals"
  ON public.health_goals FOR ALL
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vaccination_records_user_id ON public.vaccination_records(user_id);
CREATE INDEX IF NOT EXISTS idx_wellness_tracking_user_date ON public.wellness_tracking(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_health_goals_user_status ON public.health_goals(user_id, status);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers
DROP TRIGGER IF EXISTS update_vaccination_records_updated_at ON public.vaccination_records;
CREATE TRIGGER update_vaccination_records_updated_at
  BEFORE UPDATE ON public.vaccination_records
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_wellness_tracking_updated_at ON public.wellness_tracking;
CREATE TRIGGER update_wellness_tracking_updated_at
  BEFORE UPDATE ON public.wellness_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_health_goals_updated_at ON public.health_goals;
CREATE TRIGGER update_health_goals_updated_at
  BEFORE UPDATE ON public.health_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();