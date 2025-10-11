-- Add missing columns to calls table for caller and receiver information
ALTER TABLE public.calls 
  ADD COLUMN IF NOT EXISTS caller_name TEXT,
  ADD COLUMN IF NOT EXISTS caller_avatar TEXT,
  ADD COLUMN IF NOT EXISTS receiver_name TEXT,
  ADD COLUMN IF NOT EXISTS receiver_avatar TEXT;