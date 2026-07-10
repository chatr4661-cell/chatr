import { eventBus } from './EventBus';
import type { CHATREvent } from './types';
import { EventPriority } from './types';

/**
 * Stage 1.4: TraceContext
 *
 * Provides a context-bound proxy to the EventBus. We explicitly pass this
 * down the call stack from Intent -> Planner -> Provider. Any event published
 * through this context automatically inherits the correlation / trace IDs.
 *
 * The browser has no AsyncLocalStorage, so this explicit, type-safe object is
 * the most reliable way to propagate trace state down the call stack.
 */
export class TraceContext {
  constructor(
    public readonly traceId: string,
    public readonly correlationId: string,
    public readonly workflowId?: string,
  ) {}

  /**
   * Factory to start a new root trace (e.g., from a user Intent).
   * The originating intent id acts as the correlation root.
   */
  static start(intentId: string, workflowId?: string): TraceContext {
    return new TraceContext(
      crypto.randomUUID(), // new trace id for this execution tree
      intentId, // the originating intent acts as the correlation root
      workflowId,
    );
  }

  /**
   * Factory to branch a trace (e.g., Capability -> Provider).
   * Keeps the same traceId + correlationId so the whole tree stays linked.
   */
  branch(): TraceContext {
    return new TraceContext(this.traceId, this.correlationId, this.workflowId);
  }

  /**
   * Publishes an event bound to this trace context.
   */
  publish<T = unknown>(
    type: string,
    payload: T,
    opts?: {
      priority?: EventPriority;
      source?: string;
      persist?: boolean;
    },
  ): CHATREvent<T> {
    return eventBus.publish<T>(type, payload, {
      ...opts,
      traceId: this.traceId,
      correlationId: this.correlationId,
      workflowId: this.workflowId,
    });
  }
}
