
-- MCP API keys for external app authentication
CREATE TABLE public.mcp_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_name TEXT NOT NULL,
  app_description TEXT,
  api_key_hash TEXT NOT NULL,
  api_key_prefix TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '["messaging.read","messaging.send","calls.read","calls.initiate","notifications.send","brain.query"]'::jsonb,
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  last_used_at TIMESTAMPTZ,
  request_count BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- MCP request logs for auditing
CREATE TABLE public.mcp_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES public.mcp_api_keys(id) ON DELETE SET NULL,
  user_id UUID,
  tool_name TEXT NOT NULL,
  request_payload JSONB,
  response_status TEXT NOT NULL,
  latency_ms INTEGER,
  error_message TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mcp_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_request_logs ENABLE ROW LEVEL SECURITY;

-- RLS: users can only manage their own API keys
CREATE POLICY "Users can view own API keys" ON public.mcp_api_keys
  FOR SELECT TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can create API keys" ON public.mcp_api_keys
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own API keys" ON public.mcp_api_keys
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete own API keys" ON public.mcp_api_keys
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- RLS: users see their own logs
CREATE POLICY "Users can view own request logs" ON public.mcp_request_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR api_key_id IN (
    SELECT id FROM public.mcp_api_keys WHERE created_by = auth.uid()
  ));

-- Index for fast API key lookup
CREATE INDEX idx_mcp_api_keys_prefix ON public.mcp_api_keys(api_key_prefix) WHERE is_active = true;
CREATE INDEX idx_mcp_request_logs_created ON public.mcp_request_logs(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_mcp_api_keys_updated_at
  BEFORE UPDATE ON public.mcp_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
