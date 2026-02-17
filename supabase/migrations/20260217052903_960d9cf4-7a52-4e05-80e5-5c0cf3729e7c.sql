
-- Drop the previous trigger and function
DROP TRIGGER IF EXISTS trg_fcm_on_call_insert ON public.calls;
DROP FUNCTION IF EXISTS public.trigger_fcm_on_call_insert();

-- Create the streamlined trigger function using net.http_post
CREATE OR REPLACE FUNCTION public.notify_call_fcm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only trigger for ringing calls
  IF NEW.status != 'ringing' THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://sbayuqgomlflmxgicplz.supabase.co/functions/v1/fcm-call-trigger',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(current_setting('request.jwt.claim.sub', true), 'service-trigger'),
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiYXl1cWdvbWxmbG14Z2ljcGx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MTc2MDAsImV4cCI6MjA3NDk5MzYwMH0.gVSObpMtsv5W2nuLBHKT8G1_hXIprWXdn5l7Bnnj7jw'
    ),
    body := jsonb_build_object(
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
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[notify_call_fcm] Failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS call_fcm_trigger ON public.calls;
CREATE TRIGGER call_fcm_trigger
  AFTER INSERT ON public.calls
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_call_fcm();
