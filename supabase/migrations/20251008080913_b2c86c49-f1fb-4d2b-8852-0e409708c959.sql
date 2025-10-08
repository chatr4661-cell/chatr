-- Add phone-based auth columns to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS preferred_auth_method TEXT DEFAULT 'pin',
ADD COLUMN IF NOT EXISTS pin_setup_completed BOOLEAN DEFAULT false;

-- Add device security columns to device_sessions
ALTER TABLE device_sessions
ADD COLUMN IF NOT EXISTS device_fingerprint TEXT,
ADD COLUMN IF NOT EXISTS pin_hash TEXT,
ADD COLUMN IF NOT EXISTS biometric_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS quick_login_enabled BOOLEAN DEFAULT true;

-- Create login_attempts table for rate limiting
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  device_fingerprint TEXT NOT NULL,
  attempt_type TEXT NOT NULL CHECK (attempt_type IN ('pin', 'biometric', 'google')),
  success BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on login_attempts
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own login attempts
CREATE POLICY "Users can view their login attempts"
ON login_attempts
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: System can insert login attempts
CREATE POLICY "System can insert login attempts"
ON login_attempts
FOR INSERT
WITH CHECK (true);

-- Create index for phone number lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON profiles(phone_number);
CREATE INDEX IF NOT EXISTS idx_profiles_google_id ON profiles(google_id);
CREATE INDEX IF NOT EXISTS idx_device_sessions_fingerprint ON device_sessions(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_login_attempts_phone ON login_attempts(phone_number, created_at DESC);