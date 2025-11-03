-- First, update existing profiles to have placeholder values where email or phone is NULL
UPDATE profiles 
SET email = COALESCE(email, 'pending_' || id::text || '@chatr.chat')
WHERE email IS NULL;

UPDATE profiles 
SET phone_number = COALESCE(phone_number, '+000000000000')
WHERE phone_number IS NULL;

-- Reset onboarding_completed for users with placeholder values
UPDATE profiles
SET onboarding_completed = false
WHERE (email LIKE 'pending_%@chatr.chat' OR phone_number = '+000000000000')
  AND onboarding_completed = true;

-- Set NOT NULL constraints
ALTER TABLE profiles 
  ALTER COLUMN email SET NOT NULL;
  
ALTER TABLE profiles 
  ALTER COLUMN phone_number SET NOT NULL;

-- Handle unique constraint on phone_number
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_phone_number_unique;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_phone_number_key;

-- Create new unique index that excludes placeholder values
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_number_real_unique 
ON profiles (phone_number) 
WHERE phone_number != '+000000000000';

-- Add check constraint to ensure onboarding completion requires real data
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_onboarding_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_onboarding_check 
  CHECK (
    onboarding_completed = false OR 
    (onboarding_completed = true 
     AND email NOT LIKE 'pending_%@chatr.chat'
     AND phone_number != '+000000000000')
  );