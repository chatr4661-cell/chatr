
-- Fix: only create the index if it doesn't exist (tables were created in prior migration)
CREATE INDEX IF NOT EXISTS idx_mcp_request_logs_created ON public.mcp_request_logs(created_at);
