
-- Enable pg_net extension for HTTP calls from database triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to fire FCM via edge function when a call is inserted
CREATE OR REPLACE FUNCTION public.trigger_fcm_on_call_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  edge_url TEXT;
  service_key TEXT;
  payload JSONB;
BEGIN
  -- Only trigger for ringing calls
  IF NEW.status != 'ringing' THEN
    RETURN NEW;
  END IF;

  -- Build the edge function URL
  edge_url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1);
  IF edge_url IS NULL THEN
    edge_url := 'https://sbayuqgomlflmxgicplz.supabase.co';
  END IF;

  service_key := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1);
  IF service_key IS NULL THEN
    -- Use anon key as fallback (function has verify_jwt = false)
    service_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiYXl1cWdvbWxmbG14Z2ljcGx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MTc2MDAsImV4cCI6MjA3NDk5MzYwMH0.gVSObpMtsv5W2nuLBHKT8G1_hXIprWXdn5l7Bnnj7jw';
  END IF;

  -- Build payload matching the edge function's expected format
  payload := jsonb_build_object(
    'type', 'INSERT',
    'record', jsonb_build_object(
      'id', NEW.id,
      'caller_id', NEW.caller_id,
      'receiver_id', NEW.receiver_id,
      'caller_name', COALESCE(NEW.caller_name, 'Unknown'),
      'caller_avatar', COALESCE(NEW.caller_avatar, ''),
      'caller_phone', COALESCE(NEW.caller_phone, ''),
      'call_type', NEW.call_type,
      'conversation_id', NEW.conversation_id,
      'status', NEW.status
    )
  );

  -- Fire-and-forget HTTP POST to edge function via pg_net
  PERFORM extensions.http_post(
    url := edge_url || '/functions/v1/fcm-call-trigger',
    body := payload::text,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key,
      'apikey', service_key
    )
  );

  RAISE LOG '[FCM-TRIGGER] Dispatched FCM for call % to receiver %', NEW.id, NEW.receiver_id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Never fail the call insert due to FCM issues
    RAISE WARNING '[FCM-TRIGGER] Failed to dispatch FCM: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create the trigger on calls table
DROP TRIGGER IF EXISTS trg_fcm_on_call_insert ON public.calls;
CREATE TRIGGER trg_fcm_on_call_insert
  AFTER INSERT ON public.calls
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_fcm_on_call_insert();
