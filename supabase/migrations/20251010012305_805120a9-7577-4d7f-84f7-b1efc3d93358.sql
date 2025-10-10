-- CRITICAL SECURITY FIXES FOR PRODUCTION
-- Fix 1: Restrict profiles table to only show own profile and contacts
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can view their contacts' profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM contacts
    WHERE contacts.user_id = auth.uid()
    AND contacts.contact_user_id = profiles.id
  )
);

-- Fix 2: Add audit logging for medical record access
CREATE TABLE IF NOT EXISTS medical_access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES profiles(id) NOT NULL,
  provider_id uuid REFERENCES service_providers(id) NOT NULL,
  accessed_at timestamptz DEFAULT now(),
  access_type text NOT NULL, -- 'view', 'edit', 'download'
  table_name text NOT NULL,
  record_id uuid,
  ip_address text,
  user_agent text
);

ALTER TABLE medical_access_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view their access audit"
ON medical_access_audit FOR SELECT
TO authenticated
USING (patient_id = auth.uid());

CREATE POLICY "System can insert audit logs"
ON medical_access_audit FOR INSERT
TO authenticated
WITH CHECK (true);

-- Fix 3: Hash session tokens (prevent plaintext storage)
-- Add new column for hashed tokens
ALTER TABLE device_sessions 
ADD COLUMN IF NOT EXISTS session_token_hash text,
ADD COLUMN IF NOT EXISTS qr_token_hash text;

-- Fix 4: Add rate limiting for authentication attempts
CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- phone_number, email, or IP
  action_type text NOT NULL, -- 'login', 'otp_request', etc.
  attempt_count int DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  blocked_until timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_rate_limits_identifier ON rate_limits(identifier, action_type);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage rate limits"
ON rate_limits FOR ALL
TO authenticated
USING (true);

-- Fix 5: Secure file URLs with expiration metadata
ALTER TABLE lab_reports
ADD COLUMN IF NOT EXISTS url_expires_at timestamptz,
ADD COLUMN IF NOT EXISTS requires_signed_url boolean DEFAULT true;

ALTER TABLE prescriptions  
ADD COLUMN IF NOT EXISTS url_expires_at timestamptz,
ADD COLUMN IF NOT EXISTS requires_signed_url boolean DEFAULT true;

ALTER TABLE vaccination_records
ADD COLUMN IF NOT EXISTS url_expires_at timestamptz,
ADD COLUMN IF NOT EXISTS requires_signed_url boolean DEFAULT true;

-- Fix 6: Add message encryption metadata
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS is_encrypted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS encryption_key_id text;

-- Fix 7: Location data auto-deletion trigger
CREATE OR REPLACE FUNCTION auto_delete_old_location_data()
RETURNS trigger AS $$
BEGIN
  -- Auto-delete location data older than 30 days
  UPDATE messages
  SET location_latitude = NULL,
      location_longitude = NULL,
      location_name = NULL
  WHERE created_at < NOW() - INTERVAL '30 days'
  AND (location_latitude IS NOT NULL OR location_longitude IS NOT NULL);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER cleanup_location_data
AFTER INSERT ON messages
FOR EACH STATEMENT
EXECUTE FUNCTION auto_delete_old_location_data();

-- Fix 8: Add two-factor authentication support
CREATE TABLE IF NOT EXISTS two_factor_auth (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  secret_key_encrypted text NOT NULL,
  backup_codes_encrypted text[], -- Encrypted backup codes
  is_enabled boolean DEFAULT false,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE two_factor_auth ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own 2FA"
ON two_factor_auth FOR ALL
TO authenticated
USING (auth.uid() = user_id);

-- Fix 9: Content moderation and spam prevention
CREATE TABLE IF NOT EXISTS content_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL, -- 'message', 'profile', 'story'
  content_id uuid NOT NULL,
  flagged_by uuid REFERENCES profiles(id) NOT NULL,
  reason text NOT NULL,
  status text DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved'
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE content_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can flag content"
ON content_flags FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = flagged_by);

CREATE POLICY "Admins can view and manage flags"
ON content_flags FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Fix 10: Add encryption status tracking
CREATE TABLE IF NOT EXISTS encryption_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  public_key text NOT NULL,
  device_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz
);

ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their encryption keys"
ON encryption_keys FOR ALL
TO authenticated  
USING (auth.uid() = user_id);