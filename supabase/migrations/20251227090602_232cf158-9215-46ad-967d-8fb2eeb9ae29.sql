-- Create function to send FCM push notification for new messages
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  participant RECORD;
  sender_profile RECORD;
  is_group_chat BOOLEAN;
BEGIN
  -- Get sender profile
  SELECT username, avatar_url INTO sender_profile
  FROM public.profiles
  WHERE id = NEW.sender_id;

  -- Check if group chat
  SELECT COUNT(*) > 2 INTO is_group_chat
  FROM public.conversation_participants
  WHERE conversation_id = NEW.conversation_id;

  -- Notify all participants except sender
  FOR participant IN
    SELECT cp.user_id
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = NEW.conversation_id
    AND cp.user_id != NEW.sender_id
  LOOP
    -- Call FCM edge function via pg_net (fire and forget)
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/fcm-notify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'type', 'message',
        'recipientId', participant.user_id,
        'senderId', NEW.sender_id,
        'senderName', COALESCE(sender_profile.username, 'Someone'),
        'senderAvatar', sender_profile.avatar_url,
        'conversationId', NEW.conversation_id,
        'messageContent', LEFT(COALESCE(NEW.content, 'New message'), 100),
        'messageId', NEW.id::text,
        'isGroup', is_group_chat
      )::text
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to send FCM push notification for incoming calls
CREATE OR REPLACE FUNCTION public.notify_incoming_call()
RETURNS TRIGGER AS $$
DECLARE
  caller_profile RECORD;
BEGIN
  -- Only trigger on new ringing calls
  IF NEW.status != 'ringing' THEN
    RETURN NEW;
  END IF;

  -- Get caller profile
  SELECT username, avatar_url INTO caller_profile
  FROM public.profiles
  WHERE id = NEW.caller_id;

  -- Send push notification to receiver
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/fcm-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object(
      'type', 'call',
      'receiverId', NEW.receiver_id,
      'callerId', NEW.caller_id,
      'callerName', COALESCE(caller_profile.username, NEW.caller_name, 'Unknown'),
      'callerAvatar', COALESCE(caller_profile.avatar_url, NEW.caller_avatar),
      'callId', NEW.id::text,
      'callType', COALESCE(NEW.call_type, 'audio')
    )::text
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new messages (if not exists)
DROP TRIGGER IF EXISTS on_new_message_notify ON public.messages;
CREATE TRIGGER on_new_message_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();

-- Create trigger for incoming calls (if not exists)
DROP TRIGGER IF EXISTS on_incoming_call_notify ON public.calls;
CREATE TRIGGER on_incoming_call_notify
  AFTER INSERT ON public.calls
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_incoming_call();