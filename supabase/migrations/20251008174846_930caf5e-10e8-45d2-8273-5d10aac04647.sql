-- Phase 3: Create device_tokens table for push notifications
CREATE TABLE IF NOT EXISTS public.device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_token TEXT UNIQUE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage their own device tokens
CREATE POLICY "Users can manage their device tokens"
  ON public.device_tokens
  FOR ALL
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_device_tokens_user_id ON public.device_tokens(user_id);
CREATE INDEX idx_device_tokens_platform ON public.device_tokens(platform);

-- Function to send push notification on new message
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_ids UUID[];
  recipient_id UUID;
  sender_name TEXT;
BEGIN
  -- Get sender's username
  SELECT username INTO sender_name
  FROM profiles
  WHERE id = NEW.sender_id;

  -- Get all participants in this conversation except the sender
  SELECT ARRAY_AGG(user_id) INTO recipient_ids
  FROM conversation_participants
  WHERE conversation_id = NEW.conversation_id
    AND user_id != NEW.sender_id;

  -- Send push notification to each recipient
  FOREACH recipient_id IN ARRAY recipient_ids
  LOOP
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'userId', recipient_id,
        'title', sender_name,
        'body', NEW.content,
        'data', jsonb_build_object(
          'type', 'message',
          'conversationId', NEW.conversation_id,
          'messageId', NEW.id
        )
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create trigger for new messages
DROP TRIGGER IF EXISTS trigger_notify_new_message ON public.messages;
CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();

-- Function to send push notification on new call
CREATE OR REPLACE FUNCTION public.notify_new_call()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only send notification for ringing calls to receiver
  IF NEW.status = 'ringing' AND NEW.receiver_id IS NOT NULL THEN
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'userId', NEW.receiver_id,
        'title', NEW.caller_name || ' is calling',
        'body', 'Incoming ' || NEW.call_type || ' call',
        'data', jsonb_build_object(
          'type', 'call',
          'callId', NEW.id,
          'callType', NEW.call_type,
          'callerId', NEW.caller_id
        )
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for new calls
DROP TRIGGER IF EXISTS trigger_notify_new_call ON public.calls;
CREATE TRIGGER trigger_notify_new_call
  AFTER INSERT ON public.calls
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_call();