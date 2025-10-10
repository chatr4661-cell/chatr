-- Phase 3: Complete Partially Implemented Features

-- Add auto-translate fields to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en',
ADD COLUMN IF NOT EXISTS auto_translate_enabled boolean DEFAULT false;

-- Create index for language lookups
CREATE INDEX IF NOT EXISTS idx_profiles_language ON profiles(preferred_language);

-- Disappearing messages cleanup trigger
CREATE OR REPLACE FUNCTION cleanup_disappearing_messages()
RETURNS void AS $$
BEGIN
  DELETE FROM messages
  WHERE created_at < NOW() - INTERVAL '1 second' * (
    SELECT COALESCE(disappearing_messages_duration, 0)
    FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND disappearing_messages_duration IS NOT NULL
  )
  AND EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND disappearing_messages_duration IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Schedule disappearing messages cleanup (run every minute)
-- This would typically be set up with pg_cron, but we'll use a manual trigger for now
-- Admins should set up: SELECT cron.schedule('cleanup-disappearing', '* * * * *', 'SELECT cleanup_disappearing_messages()');

-- Business profiles extension
CREATE TABLE IF NOT EXISTS business_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  business_name text NOT NULL,
  business_type text NOT NULL, -- 'retail', 'service', 'restaurant', etc.
  description text,
  logo_url text,
  verified boolean DEFAULT false,
  verification_date timestamptz,
  business_hours jsonb DEFAULT '{}',
  contact_info jsonb DEFAULT '{}',
  location jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can manage their profile"
ON business_profiles FOR ALL
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view verified businesses"
ON business_profiles FOR SELECT
TO authenticated
USING (verified = true);

-- Business categories
CREATE TABLE IF NOT EXISTS business_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  icon text,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE business_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories"
ON business_categories FOR SELECT
TO authenticated
USING (true);

-- Business services/products
CREATE TABLE IF NOT EXISTS business_offerings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES business_profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  price numeric,
  currency text DEFAULT 'USD',
  image_url text,
  available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_offerings_business ON business_offerings(business_id);

ALTER TABLE business_offerings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can manage offerings"
ON business_offerings FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM business_profiles
    WHERE business_profiles.id = business_offerings.business_id
    AND business_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can view available offerings"
ON business_offerings FOR SELECT
TO authenticated
USING (available = true);

-- Update trigger for business profiles
CREATE TRIGGER update_business_profiles_updated_at
BEFORE UPDATE ON business_profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
