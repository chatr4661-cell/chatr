-- Drop the broken trigger and function
DROP TRIGGER IF EXISTS on_message_insert_notify ON messages;
DROP FUNCTION IF EXISTS notify_message_push();

-- Create improved function to send push notification on new message
CREATE OR REPLACE FUNCTION notify_message_push()
RETURNS TRIGGER AS $$
DECLARE
  receiver_ids UUID[];
  receiver_id UUID;
  sender_username TEXT;
  message_preview TEXT;
BEGIN
  -- Get sender username
  SELECT COALESCE(username, phone_number, 'Someone') INTO sender_username
  FROM profiles
  WHERE id = NEW.sender_id;

  -- Create message preview
  message_preview := LEFT(NEW.content, 100);

  -- Get all participants except sender
  SELECT ARRAY_AGG(user_id) INTO receiver_ids
  FROM conversation_participants
  WHERE conversation_id = NEW.conversation_id
  AND user_id != NEW.sender_id;

  -- Send notification to each receiver
  IF receiver_ids IS NOT NULL THEN
    FOREACH receiver_id IN ARRAY receiver_ids
    LOOP
      -- Call edge function to send push notification
      PERFORM net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/send-push-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := jsonb_build_object(
          'userId', receiver_id,
          'title', sender_username,
          'body', message_preview,
          'data', jsonb_build_object(
            'conversationId', NEW.conversation_id,
            'messageId', NEW.id,
            'type', 'new_message'
          )
        )
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new messages
CREATE TRIGGER on_message_insert_notify
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_message_push();