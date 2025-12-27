-- Drop the problematic triggers that use pg_net (which requires app.settings to be configured)
DROP TRIGGER IF EXISTS on_new_message_notify ON public.messages;
DROP TRIGGER IF EXISTS on_incoming_call_notify ON public.calls;

-- Drop the functions
DROP FUNCTION IF EXISTS public.notify_new_message();
DROP FUNCTION IF EXISTS public.notify_incoming_call();