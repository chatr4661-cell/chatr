-- Delete all data in correct order (respecting foreign keys)
DELETE FROM call_participants;
DELETE FROM calls;
DELETE FROM message_forwards;
DELETE FROM message_reactions;
DELETE FROM message_reminders;
DELETE FROM message_translations;
DELETE FROM pinned_messages;
DELETE FROM messages;
DELETE FROM conversation_notes;
DELETE FROM conversation_participants;
DELETE FROM conversations;
DELETE FROM device_sessions;
DELETE FROM contacts;
DELETE FROM login_attempts;
DELETE FROM user_points;
DELETE FROM point_transactions;
DELETE FROM connection_requests;
DELETE FROM blocked_contacts;
DELETE FROM broadcast_recipients;
DELETE FROM broadcast_lists;
DELETE FROM profiles;

-- Update phone number handling to be simpler (no country code enforcement)
DROP TRIGGER IF EXISTS normalize_phone_trigger ON profiles CASCADE;
DROP FUNCTION IF EXISTS normalize_phone_for_search() CASCADE;

-- Add a simpler phone normalization for search
CREATE OR REPLACE FUNCTION normalize_phone_search()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.phone_number IS NOT NULL THEN
    -- Just remove spaces and dashes for search
    NEW.phone_search = regexp_replace(NEW.phone_number, '[\s\-]', '', 'g');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER normalize_phone_search
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION normalize_phone_search();

-- Update handle_new_user to not require country code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Phone number is required but no country code enforcement
  IF NEW.raw_user_meta_data->>'phone_number' IS NULL THEN
    RAISE EXCEPTION 'Phone number is required for user registration';
  END IF;
  
  INSERT INTO public.profiles (id, username, avatar_url, email, phone_number, phone_hash, google_id)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      NEW.raw_user_meta_data->>'full_name',
      'User_' || substring(NEW.id::text from 1 for 8)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email,
    NEW.raw_user_meta_data->>'phone_number',
    NEW.raw_user_meta_data->>'phone_hash',
    NEW.raw_user_meta_data->>'provider_id'
  );
  RETURN NEW;
END;
$$;