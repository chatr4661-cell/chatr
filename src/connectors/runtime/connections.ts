import { supabase } from '@/integrations/supabase/client';
import type { ConnectorConnection, HealthState } from '../types';
import { ConnectorRegistry } from '../registry';

/**
 * OAuth Manager — starts consent flows and finalises them after the provider
 * redirects back. Code exchange happens exclusively in connector-hub.
 */
export const OAuthManager = {
  async start(connectorId: string, accountLabel?: string): Promise<void> {
    const connector = ConnectorRegistry.require(connectorId);
    const { redirectUrl } = await connector.connect({ accountLabel });
    if (redirectUrl && typeof window !== 'undefined') {
      window.location.href = redirectUrl;
    }
  },

  /** Reads ?connector_status=... after the provider redirect. */
  readCallbackResult(search = typeof window !== 'undefined' ? window.location.search : ''): {
    connectorId?: string;
    ok?: boolean;
    error?: string;
  } | null {
    const params = new URLSearchParams(search);
    if (!params.has('connector_status')) return null;
    return {
      connectorId: params.get('connector_id') ?? undefined,
      ok: params.get('connector_status') === 'connected',
      error: params.get('connector_error') ?? undefined,
    };
  },
};

/**
 * Connection store + health monitoring. Credentials are never selected here —
 * only connection metadata the user is allowed to see.
 */
export const ConnectionStore = {
  async list(): Promise<ConnectorConnection[]> {
    const { data, error } = await supabase
      .from('connector_connections')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as ConnectorConnection[];
  },

  async byConnector(connectorId: string): Promise<ConnectorConnection[]> {
    const { data, error } = await supabase
      .from('connector_connections')
      .select('*')
      .eq('connector_id', connectorId);
    if (error) throw error;
    return (data ?? []) as unknown as ConnectorConnection[];
  },

  async remove(connectionId: string): Promise<void> {
    const { error } = await supabase.from('connector_connections').delete().eq('id', connectionId);
    if (error) throw error;
  },
};

export const ConnectionHealth = {
  /** Derives a health signal without a network call. */
  evaluate(connection: ConnectorConnection): HealthState {
    if (connection.status === 'error') return 'failing';
    if (connection.status === 'needs_reauth') return 'degraded';
    if (connection.status !== 'connected') return 'unknown';
    if (!connection.last_synced_at) return 'degraded';
    const ageMs = Date.now() - new Date(connection.last_synced_at).getTime();
    if (ageMs > 24 * 60 * 60 * 1000) return 'degraded';
    return 'healthy';
  },

  /** Live probe through the provider. */
  async probe(connection: ConnectorConnection): Promise<HealthState> {
    try {
      const connector = ConnectorRegistry.require(connection.connector_id);
      const { health } = await connector.status(connection.id);
      return health;
    } catch {
      return 'failing';
    }
  },
};
