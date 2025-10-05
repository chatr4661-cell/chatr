-- Update existing profiles with email from auth.users
DO $$
DECLARE
  auth_user RECORD;
BEGIN
  FOR auth_user IN 
    SELECT id, email, phone FROM auth.users
  LOOP
    UPDATE profiles
    SET 
      email = auth_user.email,
      phone_number = COALESCE(phone_number, auth_user.phone)
    WHERE id = auth_user.id;
  END LOOP;
END $$;