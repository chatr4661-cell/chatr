-- Fix infinite recursion in business_team_members RLS policy
-- Drop existing policies
DROP POLICY IF EXISTS "Business owners and admins can manage team" ON business_team_members;
DROP POLICY IF EXISTS "Team members can view their team" ON business_team_members;

-- Create security definer function to check if user owns business
CREATE OR REPLACE FUNCTION public.is_business_owner(_business_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM business_profiles
    WHERE id = _business_id
    AND user_id = _user_id
  )
$$;

-- Recreate policies using the function to avoid recursion
CREATE POLICY "Business owners can manage team"
ON business_team_members
FOR ALL
USING (public.is_business_owner(business_id, auth.uid()))
WITH CHECK (public.is_business_owner(business_id, auth.uid()));

CREATE POLICY "Team members can view their team"
ON business_team_members
FOR SELECT
USING (user_id = auth.uid() OR public.is_business_owner(business_id, auth.uid()));