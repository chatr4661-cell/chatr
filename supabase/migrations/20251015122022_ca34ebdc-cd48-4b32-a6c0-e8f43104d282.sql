-- ============================================================================
-- PHASE 1: CRITICAL SECURITY FIXES
-- ============================================================================

-- Fix 1: Add search_path to all SECURITY DEFINER functions to prevent SQL injection
-- This prevents privilege escalation attacks through schema manipulation

-- Function 1: update_tutor_rating
CREATE OR REPLACE FUNCTION public.update_tutor_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE tutors 
  SET rating_average = (
    SELECT AVG(rating) FROM tutor_reviews WHERE tutor_id = NEW.tutor_id
  )
  WHERE id = NEW.tutor_id;
  RETURN NEW;
END;
$function$;

-- Function 2: update_app_rating
CREATE OR REPLACE FUNCTION public.update_app_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE mini_apps 
  SET 
    rating_average = (SELECT AVG(rating) FROM app_reviews WHERE app_id = NEW.app_id),
    rating_count = (SELECT COUNT(*) FROM app_reviews WHERE app_id = NEW.app_id)
  WHERE id = NEW.app_id;
  RETURN NEW;
END;
$function$;

-- Function 3: find_user_for_call
CREATE OR REPLACE FUNCTION public.find_user_for_call(search_term text)
RETURNS TABLE(id uuid, username text, phone_number text, is_online boolean, avatar_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Function 4: create_direct_conversation
CREATE OR REPLACE FUNCTION public.create_direct_conversation(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  existing_conv_id UUID;
  new_conv_id UUID;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF current_user_id = other_user_id THEN
    RAISE EXCEPTION 'Cannot create conversation with yourself';
  END IF;
  
  existing_conv_id := public.find_shared_conversation(current_user_id, other_user_id);
  
  IF existing_conv_id IS NOT NULL THEN
    RETURN existing_conv_id;
  END IF;
  
  INSERT INTO conversations (created_by, is_group)
  VALUES (current_user_id, false)
  RETURNING id INTO new_conv_id;
  
  INSERT INTO conversation_participants (conversation_id, user_id, role)
  VALUES 
    (new_conv_id, current_user_id, 'member'),
    (new_conv_id, other_user_id, 'member');
  
  RETURN new_conv_id;
END;
$function$;

-- Function 5: get_user_conversations_optimized
CREATE OR REPLACE FUNCTION public.get_user_conversations_optimized(p_user_id uuid)
RETURNS TABLE(id uuid, group_name text, group_icon_url text, is_group boolean, is_community boolean, community_description text, lastmessage text, lastmessagetime timestamp with time zone, otheruser jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  WITH user_convs AS (
    SELECT cp.conversation_id
    FROM conversation_participants cp
    WHERE cp.user_id = p_user_id
    LIMIT 50
  ),
  last_messages AS (
    SELECT DISTINCT ON (m.conversation_id)
      m.conversation_id,
      m.content,
      m.created_at
    FROM messages m
    WHERE m.conversation_id IN (SELECT conversation_id FROM user_convs)
    ORDER BY m.conversation_id, m.created_at DESC
  ),
  other_users AS (
    SELECT DISTINCT ON (cp.conversation_id)
      cp.conversation_id,
      jsonb_build_object(
        'id', p.id,
        'username', p.username,
        'avatar_url', p.avatar_url,
        'is_online', p.is_online
      ) as user_data
    FROM conversation_participants cp
    JOIN profiles p ON p.id = cp.user_id
    JOIN conversations c ON c.id = cp.conversation_id
    WHERE cp.conversation_id IN (SELECT conversation_id FROM user_convs)
      AND cp.user_id != p_user_id
      AND c.is_group = false
  )
  SELECT 
    c.id,
    c.group_name,
    c.group_icon_url,
    c.is_group,
    c.is_community,
    c.community_description,
    lm.content as lastmessage,
    lm.created_at as lastmessagetime,
    ou.user_data as otheruser
  FROM conversations c
  JOIN user_convs uc ON uc.conversation_id = c.id
  LEFT JOIN last_messages lm ON lm.conversation_id = c.id
  LEFT JOIN other_users ou ON ou.conversation_id = c.id
  ORDER BY lm.created_at DESC NULLS LAST;
END;
$function$;

-- Function 6: update_follower_count
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

-- Function 7: update_home_service_provider_rating
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

-- Function 8: track_app_usage
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

-- Function 9: increment_community_members
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

-- Function 10: add_call_participant
CREATE OR REPLACE FUNCTION public.add_call_participant(p_call_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE calls 
  SET is_group = true
  WHERE id = p_call_id;
  
  INSERT INTO call_participants (call_id, user_id, audio_enabled, video_enabled, is_active)
  VALUES (p_call_id, p_user_id, true, true, true)
  ON CONFLICT (call_id, user_id) DO NOTHING;
END;
$function$;

-- Function 11: get_call_participants
CREATE OR REPLACE FUNCTION public.get_call_participants(p_call_id uuid)
RETURNS TABLE(user_id uuid, username text, avatar_url text, audio_enabled boolean, video_enabled boolean, is_active boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    cp.user_id,
    p.username,
    p.avatar_url,
    cp.audio_enabled,
    cp.video_enabled,
    cp.is_active
  FROM call_participants cp
  JOIN profiles p ON p.id = cp.user_id
  WHERE cp.call_id = p_call_id
  AND cp.is_active = true;
END;
$function$;

-- Function 12: create_default_crm_pipeline
CREATE OR REPLACE FUNCTION public.create_default_crm_pipeline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO crm_pipelines (business_id, name, is_default)
  VALUES (NEW.id, 'Default Sales Pipeline', true);
  RETURN NEW;
END;
$function$;

-- Function 13: update_lead_last_contacted
CREATE OR REPLACE FUNCTION public.update_lead_last_contacted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.activity_type IN ('call', 'meeting', 'email', 'message') AND NEW.completed_at IS NOT NULL THEN
    UPDATE crm_leads
    SET last_contacted_at = NEW.completed_at
    WHERE id = NEW.lead_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- Function 14: handle_new_user_role
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'consumer');
  RETURN NEW;
END;
$function$;

-- Function 15: handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id, 
    username, 
    avatar_url, 
    email, 
    phone_number, 
    google_id
  )
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      NEW.raw_user_meta_data->>'full_name',
      'User_' || substring(NEW.id::text from 1 for 8)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email,
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone_number'),
    NEW.raw_user_meta_data->>'provider_id'
  );
  RETURN NEW;
END;
$function$;

-- ============================================================================
-- PHASE 2: DOCTOR ONBOARDING COMPLETION
-- ============================================================================

-- Create doctor_applications table
CREATE TABLE IF NOT EXISTS public.doctor_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  specialty TEXT NOT NULL,
  qualification TEXT NOT NULL,
  experience_years INTEGER NOT NULL,
  registration_number TEXT NOT NULL,
  hospital_affiliation TEXT,
  consultation_fee NUMERIC,
  preferred_language TEXT,
  bio TEXT,
  certifications TEXT[],
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.doctor_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can create their own application
CREATE POLICY "Users can create their own doctor application"
ON public.doctor_applications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can view their own application
CREATE POLICY "Users can view their own doctor application"
ON public.doctor_applications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policy: Admins can view all applications
CREATE POLICY "Admins can view all doctor applications"
ON public.doctor_applications
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- RLS Policy: Admins can update applications
CREATE POLICY "Admins can update doctor applications"
ON public.doctor_applications
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Add updated_at trigger
CREATE TRIGGER update_doctor_applications_updated_at
BEFORE UPDATE ON public.doctor_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_doctor_applications_user_id ON public.doctor_applications(user_id);
CREATE INDEX idx_doctor_applications_status ON public.doctor_applications(status);
CREATE INDEX idx_doctor_applications_created_at ON public.doctor_applications(created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE public.doctor_applications IS 'Stores doctor onboarding applications for healthcare provider registration';