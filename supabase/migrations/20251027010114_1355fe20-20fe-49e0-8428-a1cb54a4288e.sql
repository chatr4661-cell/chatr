-- Create a function to notify users when their contacts join
CREATE OR REPLACE FUNCTION notify_user_contact_joined()
RETURNS TRIGGER AS $$
DECLARE
  contact_record RECORD;
BEGIN
  -- Find all users who have this new user in their contacts
  FOR contact_record IN 
    SELECT DISTINCT c.user_id, c.contact_name
    FROM contacts c
    WHERE c.contact_phone_hash = NEW.phone_hash
    OR c.contact_phone = NEW.phone_number
  LOOP
    -- Update the contact to mark as registered
    UPDATE contacts
    SET is_registered = true,
        contact_user_id = NEW.id
    WHERE user_id = contact_record.user_id
    AND (contact_phone_hash = NEW.phone_hash OR contact_phone = NEW.phone_number);
    
    -- Create notification for the user
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      data,
      read
    ) VALUES (
      contact_record.user_id,
      'Contact Joined Chatr',
      contact_record.contact_name || ' is now on Chatr',
      'contact_joined',
      jsonb_build_object(
        'contact_id', NEW.id,
        'contact_username', NEW.username,
        'contact_avatar', NEW.avatar_url
      ),
      false
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to notify when a user's contact joins
DROP TRIGGER IF EXISTS on_contact_joined ON profiles;
CREATE TRIGGER on_contact_joined
  AFTER INSERT OR UPDATE OF phone_hash, phone_number ON profiles
  FOR EACH ROW
  WHEN (NEW.phone_hash IS NOT NULL OR NEW.phone_number IS NOT NULL)
  EXECUTE FUNCTION notify_user_contact_joined();

-- Add contact_phone_hash column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contacts' AND column_name = 'contact_phone_hash'
  ) THEN
    ALTER TABLE contacts ADD COLUMN contact_phone_hash TEXT;
    CREATE INDEX IF NOT EXISTS idx_contacts_phone_hash ON contacts(contact_phone_hash);
  END IF;
END $$;