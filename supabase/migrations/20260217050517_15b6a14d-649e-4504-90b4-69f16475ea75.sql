
-- FCM delivery validation logs for real-time call notification tracking
CREATE TABLE public.fcm_delivery_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id TEXT NOT NULL,
  receiver_id UUID NOT NULL,
  caller_id UUID NOT NULL,
  device_token_masked TEXT,
  platform TEXT,
  fcm_message_id TEXT,
  fcm_status TEXT NOT NULL DEFAULT 'pending',
  fcm_error TEXT,
  api_version TEXT DEFAULT 'v1',
  http_status INTEGER,
  tokens_found INTEGER DEFAULT 0,
  tokens_sent INTEGER DEFAULT 0,
  tokens_failed INTEGER DEFAULT 0,
  delivery_latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fcm_delivery_logs ENABLE ROW LEVEL SECURITY;

-- Callers and receivers can view their own delivery logs
CREATE POLICY "Users can view their own FCM delivery logs"
ON public.fcm_delivery_logs
FOR SELECT
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Service role inserts (edge function uses service role)
-- No INSERT policy needed for anon since edge function uses service_role_key

-- Index for fast lookups by call_id
CREATE INDEX idx_fcm_delivery_logs_call_id ON public.fcm_delivery_logs(call_id);
CREATE INDEX idx_fcm_delivery_logs_created_at ON public.fcm_delivery_logs(created_at DESC);

-- Auto-cleanup old logs (keep 7 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_fcm_delivery_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.fcm_delivery_logs WHERE created_at < now() - INTERVAL '7 days';
END;
$$;
