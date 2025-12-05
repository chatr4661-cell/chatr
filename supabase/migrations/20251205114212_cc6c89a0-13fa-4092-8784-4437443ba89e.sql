-- Create QR login sessions table
CREATE TABLE IF NOT EXISTS public.qr_login_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scanned', 'authenticated', 'expired')),
  device_info JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '2 minutes'),
  authenticated_at TIMESTAMPTZ,
  scanned_at TIMESTAMPTZ
);

-- Create linked devices table for session management
CREATE TABLE IF NOT EXISTS public.linked_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name TEXT,
  device_type TEXT DEFAULT 'web',
  browser TEXT,
  os TEXT,
  ip_address TEXT,
  last_active_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  session_token TEXT UNIQUE
);

-- Enable RLS
ALTER TABLE public.qr_login_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linked_devices ENABLE ROW LEVEL SECURITY;

-- RLS policies for qr_login_sessions
CREATE POLICY "Anyone can create QR sessions" ON public.qr_login_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read pending sessions by token" ON public.qr_login_sessions
  FOR SELECT USING (status = 'pending' OR user_id = auth.uid());

CREATE POLICY "Authenticated users can update sessions" ON public.qr_login_sessions
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- RLS policies for linked_devices
CREATE POLICY "Users can view their own devices" ON public.linked_devices
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own devices" ON public.linked_devices
  FOR ALL USING (user_id = auth.uid());

-- Enable realtime for QR sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.qr_login_sessions;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_qr_sessions_token ON public.qr_login_sessions(token);
CREATE INDEX IF NOT EXISTS idx_qr_sessions_status ON public.qr_login_sessions(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_linked_devices_user ON public.linked_devices(user_id, is_active);

-- Function to cleanup expired QR sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_qr_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.qr_login_sessions
  SET status = 'expired'
  WHERE status = 'pending' 
    AND expires_at < now();
END;
$$;