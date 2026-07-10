import type { IEventStoreAdapter } from '../EventRuntime';
import type { CHATREvent, EventQueryFilters } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { eventBus } from '../EventBus';
import { eventRuntime } from '../EventRuntime';

/**
 * Durable event store backed by the backend-only `platform_events` table.
 *
 * Writes go through the `persist-events` edge function (which uses the
 * service role to bypass RLS). Reads use the authenticated publishable
 * key directly, and realtime INSERTs are broadcast back into the local
 * EventBus (Stage 1.3 CQRS loop).
 */
export class SupabaseEventStore implements IEventStoreAdapter {
  async writeBatch(events: CHATREvent[]): Promise<void> {
    if (events.length === 0) return;

    // Map CHATREvent to the persist-events contract for platform_events.
    const rows = events.map((e) => ({
      stream_id: 'system', // all events go to the 'system' stream unless specified
      version: Date.now() * 1000 + Math.floor(Math.random() * 1000), // ordering / optimistic concurrency
      type: e.type,
      payload: e.payload ?? {},
      execution_context: {
        timestamp: e.timestamp,
        priority: e.priority,
        traceId: e.traceId,
        correlationId: e.correlationId,
        workflowId: e.workflowId,
      },
    }));

    const { error } = await supabase.functions.invoke('persist-events', {
      body: { events: rows },
    });

    if (error) {
      console.error('[SupabaseEventStore] Failed to persist batch via Edge Function:', error);
      eventBus.publish('EVENT_PERSISTENCE_FAILED', {
        error,
        count: events.length,
      });
      throw new Error(`Persistence failed: ${error.message}`);
    }
  }

  async query(filters: EventQueryFilters = {}): Promise<CHATREvent[]> {
    let query = supabase
      .from('platform_events')
      .select('*')
      .order('version', { ascending: true });

    if (filters?.type) query = query.eq('type', filters.type);
    if (filters?.stream_id) query = query.eq('stream_id', filters.stream_id);
    if (filters?.limit) query = query.limit(filters.limit);

    const { data, error } = await query;

    if (error) {
      console.error('[SupabaseEventStore] Query failed:', error);
      throw new Error(`Query failed: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      type: row.type,
      payload: row.payload,
      timestamp: row.execution_context?.timestamp || new Date(row.created_at).getTime(),
      priority: row.execution_context?.priority || 1,
    } as CHATREvent));
  }

  public enableRealtimeBroadcast(): void {
    console.info('[SupabaseEventStore] Enabling Realtime broadcast for platform_events');

    // Stage 1.3: skip local delivery for persistent events and wait for the
    // realtime round-trip instead.
    eventRuntime.realtimeActive = true;

    supabase
      .channel('platform_events_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'platform_events' },
        (payload) => {
          const row: any = payload.new;
          const ctx = row.execution_context || {};
          const event: CHATREvent = {
            id: row.id,
            type: row.type,
            payload: row.payload,
            timestamp: ctx.timestamp || new Date(row.created_at).getTime(),
            priority: ctx.priority ?? 1,
            traceId: ctx.traceId,
            correlationId: ctx.correlationId,
            workflowId: ctx.workflowId,
            source: 'supabase-realtime',
            persist: false, // already persisted
          };

          console.log(`[SupabaseEventStore] Realtime Event Received: ${event.type}`);
          eventBus.publish(event.type, event.payload, {
            id: event.id,
            source: 'supabase-realtime',
            persist: false,
            timestamp: event.timestamp,
            priority: event.priority,
            traceId: event.traceId,
            correlationId: event.correlationId,
            workflowId: event.workflowId,
          });
        },
      )
      .subscribe();
  }
}
