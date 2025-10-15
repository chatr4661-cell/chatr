-- Fix business subscription creation by removing circular dependency
-- Remove subscription_id from business_profiles (it creates circular dependency)
ALTER TABLE business_profiles DROP COLUMN IF EXISTS subscription_id;

-- Drop and recreate the trigger function with simpler logic
DROP TRIGGER IF EXISTS create_business_subscription_trigger ON business_profiles;

CREATE OR REPLACE FUNCTION public.create_default_business_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create free plan subscription
  INSERT INTO business_subscriptions (
    business_id,
    plan_type,
    status,
    monthly_price,
    features
  ) VALUES (
    NEW.id,
    'free',
    'active',
    0,
    '{"max_customers": 100, "max_team_members": 1, "broadcasts_enabled": false, "ai_enabled": false}'::jsonb
  );
  
  -- Create team member entry for the owner
  INSERT INTO business_team_members (
    business_id,
    user_id,
    role
  ) VALUES (
    NEW.id,
    NEW.user_id,
    'owner'
  );
  
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER create_business_subscription_trigger
AFTER INSERT ON business_profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_default_business_subscription();