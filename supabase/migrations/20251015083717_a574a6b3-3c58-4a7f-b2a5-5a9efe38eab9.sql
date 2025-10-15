-- Remove the problematic trigger - use CASCADE to remove dependencies
DROP TRIGGER IF EXISTS create_business_subscription_trigger ON business_profiles CASCADE;
DROP TRIGGER IF EXISTS on_business_profile_created ON business_profiles CASCADE;
DROP FUNCTION IF EXISTS public.create_default_business_subscription() CASCADE;