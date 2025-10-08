-- Add phone_hash column to profiles for privacy-preserving contact matching
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_hash text;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone_hash ON profiles(phone_hash);

-- Function to automatically update phone_hash when phone_number changes
CREATE OR REPLACE FUNCTION update_phone_hash()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if phone_number changed or phone_hash is null
  IF NEW.phone_number IS NOT NULL AND (NEW.phone_hash IS NULL OR OLD.phone_number IS DISTINCT FROM NEW.phone_number) THEN
    -- In production, this would use a proper hashing function
    -- For now, we'll set it to be updated by the application
    NEW.phone_hash := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update phone_hash
DROP TRIGGER IF EXISTS trigger_update_phone_hash ON profiles;
CREATE TRIGGER trigger_update_phone_hash
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_phone_hash();