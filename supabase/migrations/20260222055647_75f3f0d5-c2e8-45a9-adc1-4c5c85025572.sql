
-- Network metrics table for call analytics
CREATE TABLE IF NOT EXISTS public.network_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID NOT NULL,
  user_id UUID NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  bandwidth_kbps NUMERIC,
  packet_loss_percent NUMERIC,
  rtt_ms NUMERIC,
  jitter_ms NUMERIC,
  fps NUMERIC,
  resolution_width INTEGER,
  resolution_height INTEGER,
  codec TEXT,
  connection_type TEXT,
  candidate_type TEXT,
  bitrate_kbps NUMERIC,
  frames_dropped INTEGER,
  quality_level TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Device capabilities table for 4K detection
CREATE TABLE IF NOT EXISTS public.device_capabilities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  cpu_threads INTEGER,
  device_memory_gb NUMERIC,
  max_camera_width INTEGER,
  max_camera_height INTEGER,
  supports_4k BOOLEAN DEFAULT false,
  supports_av1 BOOLEAN DEFAULT false,
  supports_vp9 BOOLEAN DEFAULT false,
  supports_h264 BOOLEAN DEFAULT true,
  gpu_renderer TEXT,
  platform TEXT,
  user_agent TEXT,
  last_detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Call logs table for detailed analytics
CREATE TABLE IF NOT EXISTS public.call_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID NOT NULL,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.network_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can insert their own metrics" ON public.network_metrics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own metrics" ON public.network_metrics FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own device caps" ON public.device_capabilities FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own logs" ON public.call_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own logs" ON public.call_logs FOR SELECT USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_network_metrics_call ON public.network_metrics(call_id);
CREATE INDEX idx_network_metrics_user ON public.network_metrics(user_id);
CREATE INDEX idx_call_logs_call ON public.call_logs(call_id);
CREATE INDEX idx_call_logs_user ON public.call_logs(user_id);

-- Updated_at trigger for device_capabilities
CREATE TRIGGER update_device_capabilities_updated_at
  BEFORE UPDATE ON public.device_capabilities
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
