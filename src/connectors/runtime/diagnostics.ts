import { callHub } from './transport';
import type { ConnectionStatus, HealthState } from '../types';

/**
 * Connector Diagnostics — internal observability for the platform team.
 * Reports credential *shape* (never values), sync history, webhook delivery,
 * latency and rate-limit budget.
 */
export interface ConnectorDiagnosticRun {
  status: string;
  capability: string | null;
  duration_ms: number | null;
  items_upserted: number | null;
  created_at: string;
  error: string | null;
}

export interface ConnectorDiagnostic {
  connection_id: string;
  connector_id: string;
  account: string | null;
  status: ConnectionStatus;
  health: HealthState;
  scopes: string[];
  last_error: string | null;
  last_synced_at: string | null;
  auth: {
    kind: 'oauth2' | 'api_key' | 'credentials';
    has_access_token: boolean;
    has_refresh_token: boolean;
    token_expires_at: string | null;
    token_expired: boolean;
    credentials_updated_at: string | null;
  };
  webhooks: {
    supported: boolean;
    last_event_at: string | null;
    last_event_type: string | null;
  };
  rate_limit_per_minute: number | null;
  latency_ms: number | null;
  probe_error: string | null;
  recent_runs: ConnectorDiagnosticRun[];
  avg_duration_ms: number | null;
}

export const ConnectorDiagnostics = {
  async load(options: { probe?: boolean } = {}): Promise<{
    diagnostics: ConnectorDiagnostic[];
    generated_at: string;
  }> {
    const data = await callHub<{ diagnostics: ConnectorDiagnostic[]; generated_at: string }>({
      action: 'diagnostics',
      connector_id: 'platform',
      probe: options.probe,
    });
    return { diagnostics: data?.diagnostics ?? [], generated_at: data?.generated_at ?? '' };
  },
};
