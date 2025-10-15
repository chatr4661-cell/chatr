-- Security Fix: Add search_path to all SECURITY DEFINER functions
-- This prevents privilege escalation attacks by fixing the search path

-- Fix handle_new_user_points
CREATE OR REPLACE FUNCTION public.handle_new_user_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.user_points (user_id, balance, lifetime_earned)
  VALUES (NEW.id, 100, 100);
  
  INSERT INTO public.point_transactions (user_id, amount, transaction_type, source, description)
  VALUES (NEW.id, 100, 'earn', 'signup_bonus', 'Welcome to Chatr! Here are your first 100 points!');
  
  RETURN NEW;
END;
$function$;

-- Fix sync_user_contacts
CREATE OR REPLACE FUNCTION public.sync_user_contacts(user_uuid uuid, contact_list jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  contact_item jsonb;
  matched_user_id uuid;
BEGIN
  FOR contact_item IN SELECT * FROM jsonb_array_elements(contact_list)
  LOOP
    IF contact_item->>'email' IS NOT NULL THEN
      SELECT id INTO matched_user_id
      FROM profiles
      WHERE email = contact_item->>'email'
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
        
        CONTINUE;
      END IF;
    END IF;
    
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
$function$;

-- Fix auto_delete_old_location_data
CREATE OR REPLACE FUNCTION public.auto_delete_old_location_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE messages
  SET location_latitude = NULL,
      location_longitude = NULL,
      location_name = NULL
  WHERE created_at < NOW() - INTERVAL '30 days'
  AND (location_latitude IS NOT NULL OR location_longitude IS NOT NULL);
  
  RETURN NEW;
END;
$function$;

-- Fix update_message_delivery
CREATE OR REPLACE FUNCTION public.update_message_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.read_at IS NOT NULL AND (OLD.read_at IS NULL OR OLD.read_at IS DISTINCT FROM NEW.read_at) THEN
    UPDATE message_delivery_status
    SET 
      status = 'read',
      read_at = NEW.read_at
    WHERE message_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix backfill_phone_hashes
CREATE OR REPLACE FUNCTION public.backfill_phone_hashes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  profile_record RECORD;
  phone_normalized TEXT;
  phone_hash_value TEXT;
BEGIN
  FOR profile_record IN 
    SELECT id, phone_number 
    FROM profiles 
    WHERE phone_number IS NOT NULL 
    AND (phone_hash IS NULL OR phone_hash = '')
  LOOP
    NULL;
  END LOOP;
END;
$function$;

-- Fix cleanup_disappearing_messages
CREATE OR REPLACE FUNCTION public.cleanup_disappearing_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Fix find_shared_conversation
CREATE OR REPLACE FUNCTION public.find_shared_conversation(user1_id uuid, user2_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  shared_conv_id UUID;
BEGIN
  SELECT c.id INTO shared_conv_id
  FROM conversations c
  WHERE c.is_group = false
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp1
      WHERE cp1.conversation_id = c.id AND cp1.user_id = user1_id
    )
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp2
      WHERE cp2.conversation_id = c.id AND cp2.user_id = user2_id
    )
    AND (
      SELECT COUNT(*) FROM conversation_participants cp
      WHERE cp.conversation_id = c.id
    ) = 2
  ORDER BY c.created_at DESC
  LIMIT 1;
  
  RETURN shared_conv_id;
END;
$function$;

-- Fix update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix update_follower_count
CREATE OR REPLACE FUNCTION public.update_follower_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE official_accounts 
    SET follower_count = follower_count + 1
    WHERE id = NEW.account_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE official_accounts 
    SET follower_count = follower_count - 1
    WHERE id = OLD.account_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix update_home_service_provider_rating
CREATE OR REPLACE FUNCTION public.update_home_service_provider_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE home_service_providers 
  SET 
    rating_average = (SELECT AVG(rating) FROM home_service_reviews WHERE provider_id = NEW.provider_id),
    rating_count = (SELECT COUNT(*) FROM home_service_reviews WHERE provider_id = NEW.provider_id)
  WHERE id = NEW.provider_id;
  RETURN NEW;
END;
$function$;

-- Fix increment_community_members
CREATE OR REPLACE FUNCTION public.increment_community_members(community_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE conversations
  SET member_count = COALESCE(member_count, 0) + 1
  WHERE id = community_id;
END;
$function$;

-- Fix track_app_usage
CREATE OR REPLACE FUNCTION public.track_app_usage(p_app_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO app_usage (user_id, app_id, usage_count, last_used_at)
  VALUES (auth.uid(), p_app_id, 1, now())
  ON CONFLICT (user_id, app_id) 
  DO UPDATE SET 
    usage_count = app_usage.usage_count + 1,
    last_used_at = now();
END;
$function$;

-- Fix create_mutual_contact
CREATE OR REPLACE FUNCTION public.create_mutual_contact(user1_email text, user2_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  user1_id UUID;
  user2_id UUID;
  user1_phone TEXT;
  user2_phone TEXT;
  user1_username TEXT;
  user2_username TEXT;
BEGIN
  SELECT id, phone_number, username INTO user1_id, user1_phone, user1_username
  FROM profiles WHERE email = user1_email;
  
  SELECT id, phone_number, username INTO user2_id, user2_phone, user2_username
  FROM profiles WHERE email = user2_email;
  
  IF user1_id IS NOT NULL AND user2_id IS NOT NULL THEN
    INSERT INTO contacts (user_id, contact_user_id, contact_name, contact_phone, is_registered)
    VALUES (user1_id, user2_id, COALESCE(user2_username, user2_email), COALESCE(user2_phone, user2_email), true)
    ON CONFLICT (user_id, contact_phone) DO UPDATE SET
      contact_user_id = user2_id,
      is_registered = true,
      contact_name = EXCLUDED.contact_name;
    
    INSERT INTO contacts (user_id, contact_user_id, contact_name, contact_phone, is_registered)
    VALUES (user2_id, user1_id, COALESCE(user1_username, user1_email), COALESCE(user1_phone, user1_email), true)
    ON CONFLICT (user_id, contact_phone) DO UPDATE SET
      contact_user_id = user1_id,
      is_registered = true,
      contact_name = EXCLUDED.contact_name;
  END IF;
END;
$function$;