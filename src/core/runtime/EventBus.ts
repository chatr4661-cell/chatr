/**
 * In-memory publish/subscribe bus used by the CHATR event runtime.
 *
 * The UI and local services subscribe here. Durable events arrive back
 * through this bus after the Supabase Realtime round-trip (Stage 1.3).
 */
import type { CHATREvent } from './types';

export type EventHandler = (payload: any, meta?: Partial<CHATREvent>) => void;

class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  /** Subscribe to a specific event type. Returns an unsubscribe function. */
  subscribe(type: string, handler: EventHandler): () => void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler);
    return () => {
      set?.delete(handler);
    };
  }

  /** Publish an event to all subscribers of `type`. */
  publish(type: string, payload: any, meta?: Partial<CHATREvent>): void {
    const set = this.handlers.get(type);
    if (!set || set.size === 0) return;
    for (const handler of set) {
      try {
        handler(payload, meta);
      } catch (err) {
        console.error(`[EventBus] handler for "${type}" threw:`, err);
      }
    }
  }
}

export const eventBus = new EventBus();
