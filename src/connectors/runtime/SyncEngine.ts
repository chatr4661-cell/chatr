import { supabase } from '@/integrations/supabase/client';
import type { Capability, ConnectorConnection, SyncResult, UnifiedRecord } from '../types';
import { ConnectorRegistry } from '../registry';

/**
 * Sync Engine — orchestrates incremental pulls per capability, records run
 * history, and reads back the Unified Data Model.
 */
export const SyncEngine = {
  async syncConnection(
    connection: ConnectorConnection,
    capability?: Capability,
  ): Promise<SyncResult[]> {
    const connector = ConnectorRegistry.require(connection.connector_id);
    const capabilities = capability ? [capability] : connector.capabilities;
    const results: SyncResult[] = [];

    for (const cap of capabilities) {
      const startedAt = Date.now();
      const { data: run } = await supabase
        .from('connector_sync_runs')
        .insert({
          connection_id: connection.id,
          user_id: connection.user_id,
          capability: cap,
          status: 'running',
        })
        .select('id')
        .single();

      try {
        const [result] = await connector.sync(connection.id, cap);
        if (result) results.push(result);

        if (run?.id) {
          await supabase
            .from('connector_sync_runs')
            .update({
              status: 'succeeded',
              items_fetched: result?.fetched ?? 0,
              items_upserted: result?.upserted ?? 0,
              finished_at: new Date().toISOString(),
              duration_ms: Date.now() - startedAt,
            })
            .eq('id', run.id);
        }
      } catch (error: any) {
        if (run?.id) {
          await supabase
            .from('connector_sync_runs')
            .update({
              status: 'failed',
              error: String(error?.message ?? error),
              finished_at: new Date().toISOString(),
              duration_ms: Date.now() - startedAt,
            })
            .eq('id', run.id);
        }
      }
    }

    return results;
  },

  async syncAll(connections: ConnectorConnection[]): Promise<SyncResult[]> {
    const active = connections.filter((c) => c.status === 'connected');
    const batches = await Promise.all(active.map((c) => this.syncConnection(c)));
    return batches.flat();
  },

  /** Universal Inbox feed across every connected provider. */
  async records(options: {
    recordTypes?: string[];
    capability?: Capability;
    limit?: number;
    search?: string;
  } = {}): Promise<(UnifiedRecord & { id: string; connector_id: string })[]> {
    let query = supabase
      .from('connector_records')
      .select('*')
      .order('occurred_at', { ascending: false, nullsFirst: false })
      .limit(options.limit ?? 50);

    if (options.recordTypes?.length) query = query.in('record_type', options.recordTypes);
    if (options.capability) query = query.eq('capability', options.capability);
    if (options.search) query = query.ilike('title', `%${options.search}%`);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as any;
  },
};

/**
 * Webhook Manager — client-side view of push delivery. Registration and
 * signature verification are performed server-side by connector-hub.
 */
export const WebhookManager = {
  endpointUrl(connectorId: string): string {
    const base = import.meta.env.VITE_SUPABASE_URL;
    return `${base}/functions/v1/connector-hub/webhook/${connectorId}`;
  },

  supports(connectorId: string): boolean {
    return Boolean(ConnectorRegistry.get(connectorId)?.definition.webhooks);
  },
};
