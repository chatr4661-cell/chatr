-- Create device_sessions table for multi-device QR sync
CREATE TABLE public.device_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('mobile', 'desktop', 'tablet')),
  device_name TEXT NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  qr_token TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Enable RLS on device_sessions
ALTER TABLE public.device_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own device sessions
CREATE POLICY "Users can view their own sessions"
ON public.device_sessions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own sessions
CREATE POLICY "Users can create sessions"
ON public.device_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions
CREATE POLICY "Users can update their sessions"
ON public.device_sessions
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own sessions
CREATE POLICY "Users can delete their sessions"
ON public.device_sessions
FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for device_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.device_sessions;

-- Create health_passport table
CREATE TABLE public.health_passport (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  passport_number TEXT UNIQUE NOT NULL DEFAULT 'HP-' || LPAD(floor(random() * 999999999)::TEXT, 9, '0'),
  photo_url TEXT,
  blood_type TEXT CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  allergies JSONB DEFAULT '[]'::jsonb,
  chronic_conditions JSONB DEFAULT '[]'::jsonb,
  emergency_contact_id UUID REFERENCES public.emergency_contacts(id),
  insurance_provider TEXT,
  insurance_number TEXT,
  qr_code_data TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on health_passport
ALTER TABLE public.health_passport ENABLE ROW LEVEL SECURITY;

-- Users can manage their own health passport
CREATE POLICY "Users can manage their health passport"
ON public.health_passport
FOR ALL
USING (auth.uid() = user_id);

-- Providers can view patient passports with permission
CREATE POLICY "Providers can view patient passports"
ON public.health_passport
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.appointments
    WHERE appointments.patient_id = health_passport.user_id
    AND appointments.provider_id IN (
      SELECT id FROM public.service_providers WHERE user_id = auth.uid()
    )
  )
);

-- Create prescriptions table
CREATE TABLE public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  provider_id UUID REFERENCES public.service_providers(id),
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  duration TEXT,
  prescribed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  notes TEXT,
  prescription_file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on prescriptions
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own prescriptions
CREATE POLICY "Users can view their prescriptions"
ON public.prescriptions
FOR SELECT
USING (auth.uid() = user_id);

-- Providers can create prescriptions
CREATE POLICY "Providers can create prescriptions"
ON public.prescriptions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.service_providers
    WHERE service_providers.id = prescriptions.provider_id
    AND service_providers.user_id = auth.uid()
  )
);

-- Providers can update their prescriptions
CREATE POLICY "Providers can update prescriptions"
ON public.prescriptions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.service_providers
    WHERE service_providers.id = prescriptions.provider_id
    AND service_providers.user_id = auth.uid()
  )
);

-- Create vaccination_records table
CREATE TABLE public.vaccination_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  vaccine_name TEXT NOT NULL,
  dose_number INTEGER NOT NULL DEFAULT 1,
  date_administered DATE NOT NULL,
  next_dose_date DATE,
  administered_by TEXT,
  batch_number TEXT,
  certificate_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on vaccination_records
ALTER TABLE public.vaccination_records ENABLE ROW LEVEL SECURITY;

-- Users can manage their vaccination records
CREATE POLICY "Users can manage vaccination records"
ON public.vaccination_records
FOR ALL
USING (auth.uid() = user_id);

-- Providers can view vaccination records
CREATE POLICY "Providers can view vaccination records"
ON public.vaccination_records
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.appointments
    WHERE appointments.patient_id = vaccination_records.user_id
    AND appointments.provider_id IN (
      SELECT id FROM public.service_providers WHERE user_id = auth.uid()
    )
  )
);

-- Extend appointments table
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS diagnosis TEXT,
ADD COLUMN IF NOT EXISTS treatment_plan JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS follow_up_date DATE;

-- Create trigger to update health_passport updated_at
CREATE OR REPLACE FUNCTION update_health_passport_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_health_passport_timestamp
BEFORE UPDATE ON public.health_passport
FOR EACH ROW
EXECUTE FUNCTION update_health_passport_updated_at();