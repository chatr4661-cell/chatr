-- Add phone number columns to calls table for native Android tel: URI support
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS caller_phone text;
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS receiver_phone text;

-- Create index for phone-based lookups
CREATE INDEX IF NOT EXISTS idx_calls_caller_phone ON public.calls(caller_phone);
CREATE INDEX IF NOT EXISTS idx_calls_receiver_phone ON public.calls(receiver_phone);