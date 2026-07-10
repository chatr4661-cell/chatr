CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. platform_events
CREATE TABLE IF NOT EXISTS public.platform_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stream_id VARCHAR(255) NOT NULL,
    version BIGINT NOT NULL,
    type VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    execution_context JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(stream_id, version)
);
CREATE INDEX IF NOT EXISTS idx_platform_events_stream ON public.platform_events(stream_id);
CREATE INDEX IF NOT EXISTS idx_platform_events_type ON public.platform_events(type);

-- 2. platform_audit_logs (renamed to avoid clobbering existing append-only audit_logs)
CREATE TABLE IF NOT EXISTS public.platform_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES public.platform_events(id) ON DELETE CASCADE,
    actor VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    resource VARCHAR(255) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. dead_letters
CREATE TABLE IF NOT EXISTS public.dead_letters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES public.platform_events(id) ON DELETE CASCADE,
    error_code VARCHAR(255) NOT NULL,
    error_message TEXT NOT NULL,
    retry_count INT NOT NULL DEFAULT 0,
    last_retry_at TIMESTAMP WITH TIME ZONE,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. workflow_state
CREATE TABLE IF NOT EXISTS public.workflow_state (
    instance_id UUID PRIMARY KEY,
    definition_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    current_node VARCHAR(255),
    context JSONB NOT NULL DEFAULT '{}'::jsonb,
    execution_context JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. workflow_checkpoints
CREATE TABLE IF NOT EXISTS public.workflow_checkpoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instance_id UUID REFERENCES public.workflow_state(instance_id) ON DELETE CASCADE,
    node_id VARCHAR(255) NOT NULL,
    state_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_workflow_checkpoints_instance ON public.workflow_checkpoints(instance_id);

-- 6. provider_runs
CREATE TABLE IF NOT EXISTS public.provider_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    request_payload JSONB,
    response_payload JSONB,
    status VARCHAR(50) NOT NULL,
    latency_ms INT NOT NULL,
    execution_context JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. certification_history
CREATE TABLE IF NOT EXISTS public.certification_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(255) NOT NULL,
    provider_version VARCHAR(255) NOT NULL,
    contract_version VARCHAR(255) NOT NULL,
    verdict VARCHAR(50) NOT NULL,
    report_data JSONB NOT NULL,
    release_approved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. benchmark_history
CREATE TABLE IF NOT EXISTS public.benchmark_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(255) NOT NULL,
    metric_name VARCHAR(255) NOT NULL,
    p50_val NUMERIC,
    p95_val NUMERIC,
    p99_val NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. workflow_metrics
CREATE TABLE IF NOT EXISTS public.workflow_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instance_id UUID REFERENCES public.workflow_state(instance_id) ON DELETE CASCADE,
    duration_ms INT NOT NULL,
    nodes_executed INT NOT NULL,
    tokens_used INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. ai_traces
CREATE TABLE IF NOT EXISTS public.ai_traces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instance_id UUID REFERENCES public.workflow_state(instance_id) ON DELETE SET NULL,
    provider_id VARCHAR(255) NOT NULL,
    model_id VARCHAR(255) NOT NULL,
    prompt TEXT NOT NULL,
    response TEXT,
    latency_ms INT NOT NULL,
    tokens_used INT NOT NULL DEFAULT 0,
    execution_context JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- GRANTS (required for PostgREST access; service_role for backend kernel)
GRANT SELECT ON public.platform_events TO authenticated;
GRANT SELECT ON public.workflow_state TO authenticated;
GRANT SELECT ON public.ai_traces TO authenticated;
GRANT ALL ON public.platform_events TO service_role;
GRANT ALL ON public.platform_audit_logs TO service_role;
GRANT ALL ON public.dead_letters TO service_role;
GRANT ALL ON public.workflow_state TO service_role;
GRANT ALL ON public.workflow_checkpoints TO service_role;
GRANT ALL ON public.provider_runs TO service_role;
GRANT ALL ON public.certification_history TO service_role;
GRANT ALL ON public.benchmark_history TO service_role;
GRANT ALL ON public.workflow_metrics TO service_role;
GRANT ALL ON public.ai_traces TO service_role;

-- RLS
ALTER TABLE public.platform_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dead_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmark_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_traces ENABLE ROW LEVEL SECURITY;

-- Read policies for signed-in users
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.platform_events;
CREATE POLICY "Enable read for authenticated users" ON public.platform_events FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.workflow_state;
CREATE POLICY "Enable read for authenticated users" ON public.workflow_state FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.ai_traces;
CREATE POLICY "Enable read for authenticated users" ON public.ai_traces FOR SELECT TO authenticated USING (true);

-- Realtime for event bus UI syncing
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_state;