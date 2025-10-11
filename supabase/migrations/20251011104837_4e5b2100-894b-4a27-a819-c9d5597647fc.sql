-- Fix calls table status constraint to allow 'active' status
-- This was causing all calls to fail with constraint violation

-- Drop the old constraint
ALTER TABLE public.calls 
DROP CONSTRAINT IF EXISTS calls_status_check;

-- Add new constraint with 'active' status included
ALTER TABLE public.calls 
ADD CONSTRAINT calls_status_check 
CHECK (status = ANY (ARRAY['ringing'::text, 'active'::text, 'ongoing'::text, 'ended'::text, 'missed'::text, 'declined'::text]));