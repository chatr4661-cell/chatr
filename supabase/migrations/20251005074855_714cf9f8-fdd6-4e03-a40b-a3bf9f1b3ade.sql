-- Create test user contacts for easy testing
-- This will help the test users find each other easily

-- Function to create mutual contacts between users
CREATE OR REPLACE FUNCTION create_mutual_contact(
  user1_email TEXT,
  user2_email TEXT
) RETURNS void AS $$
DECLARE
  user1_id UUID;
  user2_id UUID;
  user1_phone TEXT;
  user2_phone TEXT;
  user1_username TEXT;
  user2_username TEXT;
BEGIN
  -- Get user1 details
  SELECT id, phone_number, username INTO user1_id, user1_phone, user1_username
  FROM profiles WHERE email = user1_email;
  
  -- Get user2 details
  SELECT id, phone_number, username INTO user2_id, user2_phone, user2_username
  FROM profiles WHERE email = user2_email;
  
  -- Only proceed if both users exist
  IF user1_id IS NOT NULL AND user2_id IS NOT NULL THEN
    -- Add user2 to user1's contacts
    INSERT INTO contacts (user_id, contact_user_id, contact_name, contact_phone, is_registered)
    VALUES (user1_id, user2_id, COALESCE(user2_username, user2_email), COALESCE(user2_phone, user2_email), true)
    ON CONFLICT (user_id, contact_phone) DO UPDATE SET
      contact_user_id = user2_id,
      is_registered = true,
      contact_name = EXCLUDED.contact_name;
    
    -- Add user1 to user2's contacts
    INSERT INTO contacts (user_id, contact_user_id, contact_name, contact_phone, is_registered)
    VALUES (user2_id, user1_id, COALESCE(user1_username, user1_email), COALESCE(user1_phone, user1_email), true)
    ON CONFLICT (user_id, contact_phone) DO UPDATE SET
      contact_user_id = user1_id,
      is_registered = true,
      contact_name = EXCLUDED.contact_name;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add phone_search column to profiles for quick lookup
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_search TEXT;

-- Create index for faster phone number lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone_search ON profiles(phone_search);
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON profiles(phone_number);

-- Update trigger to normalize phone numbers for search
CREATE OR REPLACE FUNCTION normalize_phone_for_search()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.phone_number IS NOT NULL THEN
    -- Remove all non-digit characters for search
    NEW.phone_search = regexp_replace(NEW.phone_number, '[^0-9]', '', 'g');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER normalize_phone_trigger
  BEFORE INSERT OR UPDATE OF phone_number ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION normalize_phone_for_search();

-- Enhance calls table for better call management
ALTER TABLE calls ADD COLUMN IF NOT EXISTS caller_name TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS receiver_id UUID REFERENCES profiles(id);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS receiver_name TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS ice_servers JSONB DEFAULT '[]'::jsonb;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS caller_signal JSONB;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS receiver_signal JSONB;

-- Create index for active calls
CREATE INDEX IF NOT EXISTS idx_calls_active ON calls(status, conversation_id) WHERE status IN ('ringing', 'active');

-- Add RLS policy for call receivers
DROP POLICY IF EXISTS "Users can view calls they receive" ON calls;
CREATE POLICY "Users can view calls they receive"
  ON calls FOR SELECT
  USING (
    auth.uid() = receiver_id OR 
    auth.uid() = caller_id OR
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = calls.conversation_id
        AND conversation_participants.user_id = auth.uid()
    )
  );

-- Add policy for updating received calls
DROP POLICY IF EXISTS "Users can update calls they receive" ON calls;
CREATE POLICY "Users can update calls they receive"
  ON calls FOR UPDATE
  USING (
    auth.uid() = receiver_id OR 
    auth.uid() = caller_id
  );

-- Function to find user by phone or ID
CREATE OR REPLACE FUNCTION find_user_for_call(search_term TEXT)
RETURNS TABLE (
  id UUID,
  username TEXT,
  phone_number TEXT,
  is_online BOOLEAN,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.phone_number,
    p.is_online,
    p.avatar_url
  FROM profiles p
  WHERE 
    p.id::text = search_term OR
    p.phone_number = search_term OR
    p.phone_search = regexp_replace(search_term, '[^0-9]', '', 'g') OR
    p.email = search_term
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;