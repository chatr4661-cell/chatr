-- Remove triggers that require net extension
DROP TRIGGER IF EXISTS trigger_notify_new_message ON public.messages;
DROP TRIGGER IF EXISTS trigger_notify_new_call ON public.calls;

-- Drop the functions as well
DROP FUNCTION IF EXISTS public.notify_new_message();
DROP FUNCTION IF EXISTS public.notify_new_call();