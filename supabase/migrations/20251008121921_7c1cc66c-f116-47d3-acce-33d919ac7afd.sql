-- Allow authenticated users to discover and view all profiles
-- This is necessary for users to find and start conversations with other users
DROP POLICY IF EXISTS "Profiles visible to authenticated contacts only" ON public.profiles;
DROP POLICY IF EXISTS "Users can view basic profile info" ON public.profiles;

-- Create a new comprehensive policy for viewing profiles
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles
FOR SELECT
TO public
USING (
  auth.uid() IS NOT NULL
);