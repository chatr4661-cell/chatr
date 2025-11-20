-- ============================================
-- CHATR OS: Week 1 - Core Operating System Tables
-- ============================================

-- Table: chatr_os_apps
-- Purpose: Track all mini-apps installed by users with their runtime state
CREATE TABLE IF NOT EXISTS public.chatr_os_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_name TEXT NOT NULL,
  package_name TEXT NOT NULL, -- e.g., com.chatr.music, com.chatr.calendar
  version TEXT NOT NULL DEFAULT '1.0.0',
  install_size BIGINT DEFAULT 0, -- Size in bytes
  runtime_permissions JSONB DEFAULT '[]'::jsonb, -- Permissions granted to the app
  lifecycle_state TEXT NOT NULL DEFAULT 'installed', -- installed, running, paused, suspended, terminated
  last_opened_at TIMESTAMPTZ,
  cpu_usage_avg FLOAT DEFAULT 0.0, -- Average CPU usage percentage
  memory_usage_peak BIGINT DEFAULT 0, -- Peak memory usage in bytes
  battery_drain_rate FLOAT DEFAULT 0.0, -- Battery drain per hour
  data_usage_total BIGINT DEFAULT 0, -- Total data usage in bytes
  storage_quota BIGINT DEFAULT 104857600, -- 100MB default storage quota
  storage_used BIGINT DEFAULT 0, -- Current storage used in bytes
  is_system_app BOOLEAN DEFAULT false, -- System apps can't be uninstalled
  auto_update_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Composite unique constraint: one user can't have duplicate package names
  UNIQUE(user_id, package_name)
);

-- Index for fast user app lookups
CREATE INDEX IF NOT EXISTS idx_chatr_os_apps_user_id ON public.chatr_os_apps(user_id);
CREATE INDEX IF NOT EXISTS idx_chatr_os_apps_package_name ON public.chatr_os_apps(package_name);
CREATE INDEX IF NOT EXISTS idx_chatr_os_apps_lifecycle_state ON public.chatr_os_apps(lifecycle_state);

-- Enable RLS
ALTER TABLE public.chatr_os_apps ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see and manage their own apps
CREATE POLICY "Users can view their own installed apps"
  ON public.chatr_os_apps
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can install apps"
  ON public.chatr_os_apps
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their apps"
  ON public.chatr_os_apps
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can uninstall non-system apps"
  ON public.chatr_os_apps
  FOR DELETE
  USING (auth.uid() = user_id AND is_system_app = false);

-- Table: app_sessions
-- Purpose: Track app usage sessions for analytics and resource monitoring
CREATE TABLE IF NOT EXISTS public.app_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES public.chatr_os_apps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_end TIMESTAMPTZ,
  duration_seconds INTEGER, -- Calculated when session ends
  cpu_usage_avg FLOAT DEFAULT 0.0,
  memory_usage_peak BIGINT DEFAULT 0,
  battery_drain FLOAT DEFAULT 0.0, -- Battery % drained during session
  data_sent BIGINT DEFAULT 0, -- Bytes sent
  data_received BIGINT DEFAULT 0, -- Bytes received
  screen_time_seconds INTEGER DEFAULT 0, -- Active screen time
  background_time_seconds INTEGER DEFAULT 0, -- Time in background
  crash_count INTEGER DEFAULT 0, -- Number of crashes during session
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for session queries
CREATE INDEX IF NOT EXISTS idx_app_sessions_app_id ON public.app_sessions(app_id);
CREATE INDEX IF NOT EXISTS idx_app_sessions_user_id ON public.app_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_app_sessions_start ON public.app_sessions(session_start DESC);

-- Enable RLS
ALTER TABLE public.app_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own app sessions"
  ON public.app_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create app sessions"
  ON public.app_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update app sessions"
  ON public.app_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Table: inter_app_messages
-- Purpose: Enable communication between mini-apps (like Android Intents)
CREATE TABLE IF NOT EXISTS public.inter_app_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_app_id UUID NOT NULL REFERENCES public.chatr_os_apps(id) ON DELETE CASCADE,
  target_app_id UUID NOT NULL REFERENCES public.chatr_os_apps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL, -- 'intent', 'share', 'deeplink', 'broadcast'
  action TEXT NOT NULL, -- e.g., 'OPEN', 'SHARE_IMAGE', 'REQUEST_PAYMENT'
  payload JSONB DEFAULT '{}'::jsonb, -- Message data
  priority INTEGER DEFAULT 0, -- Higher priority messages processed first
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- Message expiry (for time-sensitive actions)
  status TEXT NOT NULL DEFAULT 'pending', -- pending, delivered, acknowledged, failed, expired
  error_message TEXT, -- If delivery failed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inter_app_messages_target ON public.inter_app_messages(target_app_id, status);
CREATE INDEX IF NOT EXISTS idx_inter_app_messages_user ON public.inter_app_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_inter_app_messages_sent_at ON public.inter_app_messages(sent_at DESC);

-- Enable RLS
ALTER TABLE public.inter_app_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view messages for their apps"
  ON public.inter_app_messages
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Apps can send messages"
  ON public.inter_app_messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Apps can update message status"
  ON public.inter_app_messages
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Table: app_permissions
-- Purpose: Track granted permissions per app
CREATE TABLE IF NOT EXISTS public.app_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES public.chatr_os_apps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_name TEXT NOT NULL, -- e.g., 'camera', 'location', 'microphone', 'contacts'
  granted BOOLEAN NOT NULL DEFAULT false,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ, -- Track when permission was last used
  usage_count INTEGER DEFAULT 0, -- How many times used
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(app_id, permission_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_app_permissions_app_id ON public.app_permissions(app_id);
CREATE INDEX IF NOT EXISTS idx_app_permissions_user_id ON public.app_permissions(user_id);

-- Enable RLS
ALTER TABLE public.app_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view permissions for their apps"
  ON public.app_permissions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can grant/revoke permissions"
  ON public.app_permissions
  FOR ALL
  USING (auth.uid() = user_id);

-- Function: Calculate session duration when session ends
CREATE OR REPLACE FUNCTION public.calculate_app_session_duration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.session_end IS NOT NULL AND OLD.session_end IS NULL THEN
    NEW.duration_seconds := EXTRACT(EPOCH FROM (NEW.session_end - NEW.session_start))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger: Auto-calculate duration
DROP TRIGGER IF EXISTS trigger_calculate_session_duration ON public.app_sessions;
CREATE TRIGGER trigger_calculate_session_duration
  BEFORE UPDATE ON public.app_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_app_session_duration();

-- Function: Update app's last_opened_at when session starts
CREATE OR REPLACE FUNCTION public.update_app_last_opened()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chatr_os_apps
  SET last_opened_at = NEW.session_start,
      lifecycle_state = 'running'
  WHERE id = NEW.app_id;
  RETURN NEW;
END;
$$;

-- Trigger: Update last opened
DROP TRIGGER IF EXISTS trigger_update_app_last_opened ON public.app_sessions;
CREATE TRIGGER trigger_update_app_last_opened
  AFTER INSERT ON public.app_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_app_last_opened();

-- Function: Auto-expire old inter-app messages
CREATE OR REPLACE FUNCTION public.expire_old_inter_app_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.inter_app_messages
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at < now();
END;
$$;

COMMENT ON TABLE public.chatr_os_apps IS 'Tracks all mini-apps installed by users with runtime state and resource usage';
COMMENT ON TABLE public.app_sessions IS 'Records app usage sessions for analytics and resource monitoring';
COMMENT ON TABLE public.inter_app_messages IS 'Enables inter-app communication similar to Android Intents';
COMMENT ON TABLE public.app_permissions IS 'Tracks runtime permissions granted to each app';