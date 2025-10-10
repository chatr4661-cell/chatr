-- Remove the problematic trigger and function
DROP TRIGGER IF EXISTS on_message_insert_notify ON messages;
DROP FUNCTION IF EXISTS notify_message_push();