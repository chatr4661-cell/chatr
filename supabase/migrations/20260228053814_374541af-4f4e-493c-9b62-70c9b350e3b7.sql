
-- Fix: recreate user_call_rcp as a regular view (not security definer)
DROP VIEW IF EXISTS public.user_call_rcp;
CREATE VIEW public.user_call_rcp WITH (security_invoker = true) AS
SELECT
  c.caller_id AS user_id,
  COUNT(*) AS total_calls,
  COUNT(*) FILTER (WHERE c.outcome_tag = 'resolved') AS resolved_calls,
  ROUND(
    CASE
      WHEN COUNT(*) FILTER (WHERE c.outcome_tag IS NOT NULL) > 0
      THEN COUNT(*) FILTER (WHERE c.outcome_tag = 'resolved')::NUMERIC
           / COUNT(*) FILTER (WHERE c.outcome_tag IS NOT NULL) * 100
      ELSE 0
    END, 1
  ) AS resolved_percentage,
  COUNT(*) FILTER (
    WHERE c.created_at >= NOW() - INTERVAL '7 days'
    AND c.outcome_tag = 'resolved'
  ) AS resolved_last_7d,
  COUNT(*) FILTER (
    WHERE c.created_at >= NOW() - INTERVAL '7 days'
  ) AS total_last_7d
FROM public.calls c
WHERE c.outcome_tag IS NOT NULL
GROUP BY c.caller_id;
