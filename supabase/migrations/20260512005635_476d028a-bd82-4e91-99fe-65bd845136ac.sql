CREATE OR REPLACE FUNCTION public.trigger_compute_trust()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := COALESCE(NEW.user_id, OLD.user_id);
  IF v_user_id IS NOT NULL THEN
    PERFORM public.compute_trust_score(v_user_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;