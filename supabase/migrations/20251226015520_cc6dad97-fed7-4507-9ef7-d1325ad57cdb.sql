-- Fix remaining overly permissive policies

-- 1. Remove the problematic profiles policy that allows all authenticated users to view all profiles
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

-- 2. Fix user_locations - remove duplicate policies and ensure proper isolation
DROP POLICY IF EXISTS "Users can insert their own location" ON public.user_locations;
DROP POLICY IF EXISTS "Users can manage their locations" ON public.user_locations;
DROP POLICY IF EXISTS "Users can view their own location history" ON public.user_locations;
DROP POLICY IF EXISTS "Users can only access their own locations" ON public.user_locations;

-- Create single comprehensive policy for user_locations
CREATE POLICY "Users can only manage their own locations"
ON public.user_locations FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Fix contacts - ensure proper isolation
DROP POLICY IF EXISTS "Users can manage their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can only view their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can insert their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can update their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can delete their own contacts" ON public.contacts;

-- Create single comprehensive policy for contacts
CREATE POLICY "Users can only manage their own contacts"
ON public.contacts FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);