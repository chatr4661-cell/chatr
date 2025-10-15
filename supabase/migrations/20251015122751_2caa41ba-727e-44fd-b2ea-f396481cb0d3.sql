-- Fix final 7 functions without search_path

-- Function 1: auto_approve_verified_developer
CREATE OR REPLACE FUNCTION public.auto_approve_verified_developer()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF (SELECT is_verified FROM developer_profiles WHERE id = NEW.developer_id) = true
     AND (SELECT COUNT(*) FROM app_submissions WHERE developer_id = NEW.developer_id AND submission_status = 'approved') < 2 THEN
    NEW.submission_status := 'approved';
    NEW.reviewed_at := now();
  END IF;
  RETURN NEW;
END;
$function$;

-- Function 2: handle_updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Function 3: mark_call_as_missed
CREATE OR REPLACE FUNCTION public.mark_call_as_missed()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.status = 'ended' AND OLD.status = 'ringing' AND NEW.started_at IS NULL THEN
    NEW.missed = true;
  END IF;
  RETURN NEW;
END;
$function$;

-- Function 4: normalize_phone_search
CREATE OR REPLACE FUNCTION public.normalize_phone_search()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.phone_number IS NOT NULL THEN
    NEW.phone_search = regexp_replace(NEW.phone_number, '[\s\-]', '', 'g');
  END IF;
  RETURN NEW;
END;
$function$;

-- Function 5: update_chatr_updated_at
CREATE OR REPLACE FUNCTION public.update_chatr_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Function 6: update_health_passport_updated_at
CREATE OR REPLACE FUNCTION public.update_health_passport_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Function 7: update_phone_hash
CREATE OR REPLACE FUNCTION public.update_phone_hash()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.phone_number IS NOT NULL AND (NEW.phone_hash IS NULL OR OLD.phone_number IS DISTINCT FROM NEW.phone_number) THEN
    NEW.phone_hash := NULL;
  END IF;
  RETURN NEW;
END;
$function$;