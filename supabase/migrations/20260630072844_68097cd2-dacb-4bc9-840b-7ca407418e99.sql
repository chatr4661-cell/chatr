GRANT SELECT, INSERT, UPDATE, DELETE ON public.communication_events TO authenticated;
GRANT ALL ON public.communication_events TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mobile_action_queue TO authenticated;
GRANT ALL ON public.mobile_action_queue TO service_role;