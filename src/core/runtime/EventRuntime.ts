/**
 * EventRuntime — coordinates local delivery (EventBus) with the durable
 * store adapter (Supabase, via the persist-events edge function).
 *
 * Stage 1.3 CQRS loop:
 *  - Non-persistent events are delivered locally immediately.
 *  - Persistent events are written to the store. When `realtimeActive` is
 *    true, local delivery is skipped and the event is re-delivered only
 *    after the Supabase Realtime INSERT round-trip, guaranteeing a single
 *    source of truth.
 */
import type { CHATREvent, EventQueryFilters } from './types';
import { eventBus } from './EventBus';

export interface IEventStoreAdapter {
  writeBatch(events: CHATREvent[]): Promise<void>;
  query(filters: EventQueryFilters): Promise<CHATREvent[]>;
}

class EventRuntime {
  /** When true, persistent events wait for the realtime round-trip before local delivery. */
  public realtimeActive = false;

  private store: IEventStoreAdapter | null = null;

  setStoreAdapter(adapter: IEventStoreAdapter): void {
    this.store = adapter;
  }

  getStoreAdapter(): IEventStoreAdapter | null {
    return this.store;
  }

  /** Dispatch a single event through the runtime. */
  async dispatch(event: CHATREvent): Promise<void> {
    const normalized: CHATREvent = {
      priority: 1,
      timestamp: Date.now(),
      source: 'local',
      ...event,
    };

    if (normalized.persist && this.store) {
      await this.store.writeBatch([normalized]);
      // When realtime is active, delivery happens on the INSERT round-trip.
      if (this.realtimeActive) return;
    }

    eventBus.publish(normalized.type, normalized.payload, normalized);
  }

  /** Query durable events from the store. */
  async query(filters: EventQueryFilters = {}): Promise<CHATREvent[]> {
    if (!this.store) return [];
    return this.store.query(filters);
  }
}

export const eventRuntime = new EventRuntime();
