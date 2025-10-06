-- Add ringtone preferences to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS notification_tone text DEFAULT '/notification.mp3',
ADD COLUMN IF NOT EXISTS call_ringtone text DEFAULT '/ringtone.mp3';