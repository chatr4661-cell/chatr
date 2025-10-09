-- Clean up any orphaned auth users without profiles for this phone
DO $$
DECLARE
  auth_user_id UUID;
BEGIN
  -- Find auth users with this phone that don't have profiles
  FOR auth_user_id IN 
    SELECT u.id FROM auth.users u 
    LEFT JOIN profiles p ON u.id = p.id 
    WHERE (u.phone = '+919717845477' OR u.email LIKE '%919717845477%')
    AND p.id IS NULL
  LOOP
    -- Delete the orphaned auth user
    DELETE FROM auth.users WHERE id = auth_user_id;
    RAISE NOTICE 'Deleted orphaned auth user: %', auth_user_id;
  END LOOP;
END $$;