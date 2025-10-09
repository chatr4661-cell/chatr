-- Add simple PIN column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pin TEXT;

-- Add index for phone number lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON profiles(phone_number);