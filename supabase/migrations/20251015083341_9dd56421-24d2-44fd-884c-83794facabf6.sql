-- Fix the business subscription trigger to avoid foreign key violation
-- Drop the old trigger
DROP TRIGGER IF EXISTS create_business_subscription_trigger ON business_profiles;

-- Recreate the function to run AFTER insert
CREATE OR REPLACE FUNCTION public.create_default_business_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_subscription_id UUID;
BEGIN
  -- Create free plan subscription AFTER the business profile exists
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
  ) RETURNING id INTO new_subscription_id;
  
  -- Update business profile with subscription_id
  UPDATE business_profiles 
  SET subscription_id = new_subscription_id
  WHERE id = NEW.id;
  
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

-- Create the trigger to run AFTER INSERT (not BEFORE)
CREATE TRIGGER create_business_subscription_trigger
AFTER INSERT ON business_profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_default_business_subscription();