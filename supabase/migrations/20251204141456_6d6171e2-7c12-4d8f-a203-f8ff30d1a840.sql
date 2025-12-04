-- Add disappearing messages support to conversations
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS disappearing_messages_duration INTEGER DEFAULT NULL;
-- NULL = disabled, values in seconds (e.g., 86400 = 24 hours, 604800 = 7 days)

-- Add expiry tracking to messages
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_expired BOOLEAN DEFAULT FALSE;

-- Create index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_messages_expires_at ON public.messages(expires_at) WHERE expires_at IS NOT NULL AND is_expired = FALSE;

-- Function to set message expiry based on conversation settings
CREATE OR REPLACE FUNCTION public.set_message_expiry()
RETURNS TRIGGER AS $$
BEGIN
  -- Get disappearing duration from conversation
  SELECT disappearing_messages_duration INTO NEW.expires_at
  FROM public.conversations 
  WHERE id = NEW.conversation_id;
  
  -- If duration is set, calculate expiry time
  IF NEW.expires_at IS NOT NULL THEN
    NEW.expires_at := NOW() + (NEW.expires_at || ' seconds')::INTERVAL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-set expiry on new messages
DROP TRIGGER IF EXISTS trigger_set_message_expiry ON public.messages;
CREATE TRIGGER trigger_set_message_expiry
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_message_expiry();

-- Function to cleanup expired messages (called by cron or edge function)
CREATE OR REPLACE FUNCTION public.cleanup_expired_messages()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM public.messages 
    WHERE expires_at IS NOT NULL 
      AND expires_at < NOW() 
      AND is_expired = FALSE
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;