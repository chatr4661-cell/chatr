-- Expose call_history as a security-invoker view over the existing calls table.
-- This resolves PGRST205 (missing public.call_history) for the native Android client
-- without duplicating data: the view serves real call records and inherits calls' RLS.
CREATE OR REPLACE VIEW public.call_history
WITH (security_invoker = on) AS
  SELECT
    id,
    conversation_id,
    caller_id,
    receiver_id,
    call_type,
    status,
    started_at,
    ended_at,
    duration,
    missed,
    is_group,
    caller_name,
    receiver_name,
    caller_avatar,
    receiver_avatar,
    caller_phone,
    receiver_phone,
    connection_quality,
    quality_rating,
    created_at
  FROM public.calls;

-- PostgREST role grants so the Data API can reach the view.
GRANT SELECT ON public.call_history TO authenticated;
GRANT SELECT ON public.call_history TO anon;

-- Refresh the PostgREST schema cache so the new view is discoverable immediately.
NOTIFY pgrst, 'reload schema';