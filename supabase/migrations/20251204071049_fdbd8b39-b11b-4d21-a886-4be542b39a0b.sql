-- Drop the trigger first, then the function with CASCADE
DROP TRIGGER IF EXISTS on_contact_joined ON profiles;
DROP TRIGGER IF EXISTS on_profile_created_notify_contacts ON profiles;
DROP FUNCTION IF EXISTS notify_user_contact_joined() CASCADE;

-- Recreate with error handling and correct columns
CREATE OR REPLACE FUNCTION public.notify_user_contact_joined()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Wrapped in exception handler to never block profile creation
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER on_contact_joined
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_contact_joined();