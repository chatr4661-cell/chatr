
-- Add push_token to user_devices if missing
ALTER TABLE public.user_devices ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Add active_call_id index for handoff queries
CREATE INDEX IF NOT EXISTS idx_user_devices_active_call ON public.user_devices(user_id, active_call_id) WHERE active_call_id IS NOT NULL;
