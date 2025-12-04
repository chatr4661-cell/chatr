-- Add firebase_uid column to profiles for Firebase Phone Auth sync
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS firebase_uid TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_firebase_uid ON public.profiles(firebase_uid);

-- Add comment
COMMENT ON COLUMN public.profiles.firebase_uid IS 'Firebase UID for phone auth users synced from Firebase Authentication';