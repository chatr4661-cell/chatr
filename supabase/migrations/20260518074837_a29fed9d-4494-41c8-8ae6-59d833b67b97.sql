-- =========================================================================
-- Security Hardening — Phase 1
-- Scope: 2 SECURITY DEFINER hardening + 1 EXECUTE revoke
-- Zero schema changes, zero client-visible behavior changes.
-- =========================================================================

-- FIX 1a: pin search_path on is_micro_task_admin (admin gate)
ALTER FUNCTION public.is_micro_task_admin(uuid)
  SET search_path = public;

-- FIX 1b: pin search_path on update_micro_task_fraud_score (fraud trigger)
ALTER FUNCTION public.update_micro_task_fraud_score()
  SET search_path = public;

-- FIX 2: lock down award_trust_factor — only triggers (run as owner) and
-- service_role may call it. Authenticated users can no longer self-award.
REVOKE EXECUTE ON FUNCTION public.award_trust_factor(uuid, text, numeric, numeric, text)
  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.award_trust_factor(uuid, text, numeric, numeric, text)
  FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.award_trust_factor(uuid, text, numeric, numeric, text)
  TO service_role;