-- Create function to send push notification on new message
CREATE OR REPLACE FUNCTION notify_message_push()
RETURNS TRIGGER AS $$
DECLARE
  receiver_id UUID;
  sender_username TEXT;
  message_preview TEXT;
BEGIN
  -- Get receiver ID from conversation
  SELECT CASE 
    WHEN NEW.sender_id = c.user1_id THEN c.user2_id
    ELSE c.user1_id
  END INTO receiver_id
  FROM conversations c
  WHERE c.id = NEW.conversation_id;

  -- Get sender username
  SELECT COALESCE(username, phone_number, 'Someone') INTO sender_username
  FROM profiles
  WHERE id = NEW.sender_id;

  -- Create message preview
  message_preview := LEFT(NEW.content, 100);

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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new messages
DROP TRIGGER IF EXISTS on_message_insert_notify ON messages;
CREATE TRIGGER on_message_insert_notify
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_message_push();