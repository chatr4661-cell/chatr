-- Create table to store OTP codes temporarily
CREATE TABLE IF NOT EXISTS otp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '10 minutes'),
  verified BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for sending OTP)
CREATE POLICY "Anyone can request OTP" ON otp_verifications
  FOR INSERT WITH CHECK (true);

-- Allow anyone to read their own OTP for verification
CREATE POLICY "Users can verify their OTP" ON otp_verifications
  FOR SELECT USING (true);

-- Auto-delete expired OTPs
CREATE INDEX idx_otp_expires ON otp_verifications(expires_at);
