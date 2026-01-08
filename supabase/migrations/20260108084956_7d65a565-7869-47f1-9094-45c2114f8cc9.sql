-- Add remaining VoIP settings columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS ivr_settings JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS speed_dial_settings JSONB DEFAULT '{}';