-- Backfill CEO role for existing founder profiles (trigger only fires on new inserts)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'ceo'::public.app_role FROM public.profiles
WHERE phone_number IS NOT NULL
  AND regexp_replace(phone_number, '[^0-9]', '', 'g') IN ('919717845477','9717845477')
ON CONFLICT (user_id, role) DO NOTHING;