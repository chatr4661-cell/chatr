-- Add call forwarding and blocking settings to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS call_forwarding_settings JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS call_blocking_settings JSONB DEFAULT '{}';

-- Add columns to user_devices for call pull/flip
ALTER TABLE public.user_devices 
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS active_call_id UUID REFERENCES public.calls(id) ON DELETE SET NULL;

-- Create index for online devices
CREATE INDEX IF NOT EXISTS idx_user_devices_online ON public.user_devices(user_id, is_online) WHERE is_online = true;

-- Update webrtc_signals table to use consistent column names
-- (Already exists with sender_id/receiver_id, just ensure call_id exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'webrtc_signals' AND column_name = 'call_id') THEN
    ALTER TABLE public.webrtc_signals ADD COLUMN call_id UUID REFERENCES public.calls(id);
  END IF;
END $$;