-- Create app_role enum if not exists
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'provider', 'consumer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- user_roles table already exists, just add policy for admins to manage
CREATE POLICY "Admins can manage all user_roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Insert super admin role for chatr4661@gmail.com
-- First we need to find the user_id for this email
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'chatr4661@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Add analytics table for admin dashboard
CREATE TABLE IF NOT EXISTS public.analytics_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_appointments INTEGER DEFAULT 0,
  total_revenue NUMERIC(10,2) DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  active_providers INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.analytics_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view analytics"
ON public.analytics_data
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage analytics"
ON public.analytics_data
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add payment tracking table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES public.appointments(id),
  provider_id UUID REFERENCES public.service_providers(id),
  patient_id UUID NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  payment_status TEXT DEFAULT 'pending',
  payment_method TEXT,
  transaction_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their payments"
ON public.payments
FOR SELECT
TO authenticated
USING (
  auth.uid() = patient_id OR 
  EXISTS (
    SELECT 1 FROM service_providers 
    WHERE service_providers.id = payments.provider_id 
    AND service_providers.user_id = auth.uid()
  ) OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can manage all payments"
ON public.payments
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Update service_providers to allow providers to manage their own profiles
CREATE POLICY "Providers can insert their profile"
ON public.service_providers
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_provider ON public.payments(provider_id);
CREATE INDEX IF NOT EXISTS idx_payments_patient ON public.payments(patient_id);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON public.analytics_data(date);

-- Add trigger for updated_at
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_analytics_updated_at
  BEFORE UPDATE ON public.analytics_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();