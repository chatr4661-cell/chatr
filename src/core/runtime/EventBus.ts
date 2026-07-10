/**
 * In-memory publish/subscribe bus used by the CHATR event runtime.
 *
 * The UI and local services subscribe here. Durable events arrive back
 * through this bus after the Supabase Realtime round-trip (Stage 1.3).
 */
import type { CHATREvent } from './types';
import { EventPriority } from './types';

export type EventHandler<T = any> = (payload: T, meta: CHATREvent<T>) => void;

class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  /** Subscribe to a specific event type. Returns an unsubscribe function. */
  subscribe<T = any>(type: string, handler: EventHandler<T>): () => void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler as EventHandler);
    return () => {
      set?.delete(handler as EventHandler);
    };
  }

  /**
   * Publish an event to all subscribers of `type`.
   * Returns the fully-normalized event (with a generated `id`) so callers
   * can anchor a trace to it (Stage 1.4).
   */
  publish<T = any>(
    type: string,
    payload?: T,
    meta?: Partial<CHATREvent<T>>,
  ): CHATREvent<T> {
    const event: CHATREvent<T> = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      priority: EventPriority.NORMAL,
      source: 'local',
      ...meta,
      type,
      payload,
    };

    const set = this.handlers.get(type);
    if (set && set.size > 0) {
      for (const handler of set) {
        try {
          handler(event.payload, event);
        } catch (err) {
          console.error(`[EventBus] handler for "${type}" threw:`, err);
        }
      }
    }

    return event;
  }
}

export const eventBus = new EventBus();
