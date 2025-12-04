-- Add pin_hash column to profiles table for PIN authentication
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pin_hash TEXT;