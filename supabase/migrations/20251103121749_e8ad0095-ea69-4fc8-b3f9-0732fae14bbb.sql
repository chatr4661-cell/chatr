-- Add location and presence fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS location_city TEXT,
ADD COLUMN IF NOT EXISTS location_country TEXT,
ADD COLUMN IF NOT EXISTS location_latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS location_longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS location_ip TEXT,
ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS location_sharing_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS location_precision TEXT DEFAULT 'city' CHECK (location_precision IN ('exact', 'city', 'off')),
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for location queries
CREATE INDEX IF NOT EXISTS idx_profiles_location_updated ON profiles(location_updated_at);

-- Function to update last_seen automatically
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_seen_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_seen on any profile update
DROP TRIGGER IF EXISTS trigger_update_last_seen ON profiles;
CREATE TRIGGER trigger_update_last_seen
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_last_seen();