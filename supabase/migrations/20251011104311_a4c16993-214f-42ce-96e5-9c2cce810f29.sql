-- Add call_ringtone column to profiles table
-- This allows users to select their preferred ringtone for incoming calls

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS call_ringtone TEXT DEFAULT '/ringtone.mp3';

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.call_ringtone IS 'User selected ringtone path for incoming calls';