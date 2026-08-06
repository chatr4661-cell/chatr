-- Connections
CREATE TABLE public.connector_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  connector_id text NOT NULL,
  display_name text,
  account_label text,
  status text NOT NULL DEFAULT 'disconnected',
  health text NOT NULL DEFAULT 'unknown',
  capabilities text[] NOT NULL DEFAULT '{}',
  scopes text[] NOT NULL DEFAULT '{}',
  last_error text,
  last_synced_at timestamptz,
  sync_cursor jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, connector_id, account_label)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connector_connections TO authenticated;
GRANT ALL ON public.connector_connections TO service_role;
ALTER TABLE public.connector_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own connections" ON public.connector_connections FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Credential vault (backend only)
CREATE TABLE public.connector_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.connector_connections(id) ON DELETE CASCADE,
  access_token text,
  refresh_token text,
  token_type text,
  expires_at timestamptz,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (connection_id)
);
GRANT ALL ON public.connector_credentials TO service_role;
ALTER TABLE public.connector_credentials ENABLE ROW LEVEL SECURITY;

-- Sync runs
CREATE TABLE public.connector_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.connector_connections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  capability text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  items_fetched integer NOT NULL DEFAULT 0,
  items_upserted integer NOT NULL DEFAULT 0,
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms integer
);
GRANT SELECT, INSERT, UPDATE ON public.connector_sync_runs TO authenticated;
GRANT ALL ON public.connector_sync_runs TO service_role;
ALTER TABLE public.connector_sync_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sync runs" ON public.connector_sync_runs FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Webhook events (backend only)
CREATE TABLE public.connector_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id text NOT NULL,
  connection_id uuid REFERENCES public.connector_connections(id) ON DELETE CASCADE,
  event_type text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed boolean NOT NULL DEFAULT false,
  error text,
  received_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.connector_webhook_events TO service_role;
ALTER TABLE public.connector_webhook_events ENABLE ROW LEVEL SECURITY;

-- Unified data model
CREATE TABLE public.connector_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  connection_id uuid NOT NULL REFERENCES public.connector_connections(id) ON DELETE CASCADE,
  connector_id text NOT NULL,
  capability text NOT NULL,
  record_type text NOT NULL,
  external_id text NOT NULL,
  title text,
  body text,
  url text,
  author text,
  participants jsonb NOT NULL DEFAULT '[]'::jsonb,
  occurred_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (connection_id, record_type, external_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connector_records TO authenticated;
GRANT ALL ON public.connector_records TO service_role;
ALTER TABLE public.connector_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own records" ON public.connector_records FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_connector_records_user_time ON public.connector_records (user_id, occurred_at DESC);
CREATE INDEX idx_connector_records_type ON public.connector_records (user_id, record_type);
CREATE INDEX idx_connector_connections_user ON public.connector_connections (user_id, connector_id);

CREATE TRIGGER trg_connector_connections_updated BEFORE UPDATE ON public.connector_connections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_connector_records_updated BEFORE UPDATE ON public.connector_records
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();