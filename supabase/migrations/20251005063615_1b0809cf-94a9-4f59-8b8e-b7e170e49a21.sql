-- Add email to profiles for contact matching
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Update existing profiles with email from auth.users
-- This will be handled by the trigger for new users

-- Update the handle_new_user function to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url, email, phone_number)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      split_part(NEW.email, '@', 1),
      'User_' || substring(NEW.phone::text from 1 for 8),
      'User_' || substring(NEW.id::text from 1 for 8)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email,
    NEW.phone
  );
  RETURN NEW;
END;
$function$;

-- Create a function to sync contacts automatically
CREATE OR REPLACE FUNCTION sync_user_contacts(user_uuid uuid, contact_list jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  contact_item jsonb;
  matched_user_id uuid;
BEGIN
  -- Loop through each contact in the list
  FOR contact_item IN SELECT * FROM jsonb_array_elements(contact_list)
  LOOP
    -- Try to match by email
    IF contact_item->>'email' IS NOT NULL THEN
      SELECT id INTO matched_user_id
      FROM profiles
      WHERE email = contact_item->>'email'
      LIMIT 1;
      
      IF matched_user_id IS NOT NULL THEN
        -- Insert or update contact
        INSERT INTO contacts (user_id, contact_user_id, contact_name, contact_phone, is_registered)
        VALUES (
          user_uuid,
          matched_user_id,
          contact_item->>'name',
          contact_item->>'phone',
          true
        )
        ON CONFLICT (user_id, contact_phone) 
        DO UPDATE SET 
          contact_user_id = matched_user_id,
          is_registered = true,
          contact_name = EXCLUDED.contact_name;
        
        CONTINUE;
      END IF;
    END IF;
    
    -- Try to match by phone
    IF contact_item->>'phone' IS NOT NULL THEN
      SELECT id INTO matched_user_id
      FROM profiles
      WHERE phone_number = contact_item->>'phone'
      LIMIT 1;
      
      IF matched_user_id IS NOT NULL THEN
        INSERT INTO contacts (user_id, contact_user_id, contact_name, contact_phone, is_registered)
        VALUES (
          user_uuid,
          matched_user_id,
          contact_item->>'name',
          contact_item->>'phone',
          true
        )
        ON CONFLICT (user_id, contact_phone) 
        DO UPDATE SET 
          contact_user_id = matched_user_id,
          is_registered = true,
          contact_name = EXCLUDED.contact_name;
      ELSE
        -- Insert unregistered contact
        INSERT INTO contacts (user_id, contact_name, contact_phone, is_registered)
        VALUES (
          user_uuid,
          contact_item->>'name',
          contact_item->>'phone',
          false
        )
        ON CONFLICT (user_id, contact_phone) 
        DO UPDATE SET contact_name = EXCLUDED.contact_name;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Add unique constraint to contacts
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_user_id_contact_phone_key;
ALTER TABLE contacts ADD CONSTRAINT contacts_user_id_contact_phone_key UNIQUE(user_id, contact_phone);