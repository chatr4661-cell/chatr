-- Fix Critical Security Issues

-- 1. Create provider access consents table for health passport security
CREATE TABLE IF NOT EXISTS provider_access_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(patient_id, provider_id)
);

-- Enable RLS on provider_access_consents
ALTER TABLE provider_access_consents ENABLE ROW LEVEL SECURITY;

-- Patients can manage their own consents
CREATE POLICY "Patients can manage their consents"
ON provider_access_consents FOR ALL
USING (
  auth.uid() = patient_id OR
  EXISTS (
    SELECT 1 FROM service_providers
    WHERE service_providers.id = provider_access_consents.provider_id
    AND service_providers.user_id = auth.uid()
  )
);

-- 2. Update health_passport RLS policy to use time-limited consent
DROP POLICY IF EXISTS "Providers can view patient passports" ON health_passport;

CREATE POLICY "Providers need active consent to view patient data"
ON health_passport FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM provider_access_consents pac
    JOIN service_providers sp ON sp.id = pac.provider_id
    WHERE pac.patient_id = health_passport.user_id
    AND sp.user_id = auth.uid()
    AND pac.is_active = true
    AND pac.expires_at > now()
  )
);

-- 3. Fix profiles table RLS - restrict contact info exposure
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;

CREATE POLICY "Profiles visible to authenticated contacts only"
ON profiles FOR SELECT
USING (
  auth.uid() = id OR
  EXISTS (
    SELECT 1 FROM contacts
    WHERE contacts.user_id = auth.uid()
    AND contacts.contact_user_id = profiles.id
    AND contacts.is_registered = true
  ) OR
  has_role(auth.uid(), 'admin')
);

-- 4. Fix payment RLS policies - restrict to involved parties only
DROP POLICY IF EXISTS "Users can view their payments" ON payments;

CREATE POLICY "Only involved parties can view payments"
ON payments FOR SELECT
USING (
  auth.uid() = patient_id OR
  EXISTS (
    SELECT 1 FROM service_providers
    WHERE service_providers.id = payments.provider_id
    AND service_providers.user_id = auth.uid()
  ) OR
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Only involved parties can update payments"
ON payments FOR UPDATE
USING (
  auth.uid() = patient_id OR
  EXISTS (
    SELECT 1 FROM service_providers
    WHERE service_providers.id = payments.provider_id
    AND service_providers.user_id = auth.uid()
  ) OR
  has_role(auth.uid(), 'admin')
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_provider_consents_patient ON provider_access_consents(patient_id);
CREATE INDEX IF NOT EXISTS idx_provider_consents_provider ON provider_access_consents(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_consents_active ON provider_access_consents(is_active, expires_at) WHERE is_active = true;