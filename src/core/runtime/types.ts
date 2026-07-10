/**
 * Core event types for the CHATR event runtime (Stage 1.3 CQRS loop,
 * Stage 1.4 trace correlation).
 */

/** Delivery priority for events. Numeric so it stays compatible with the store. */
export enum EventPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}

export interface CHATREvent<T = any> {
  /** Client-generated id assigned at publish time; the store may keep its own. */
  id?: string;
  /** Event type, e.g. "WORKFLOW_STARTED". */
  type: string;
  /** Arbitrary event payload. */
  payload?: T;
  /** Epoch millis when the event was created. */
  timestamp?: number;
  /** Delivery priority (higher = more urgent). Defaults to NORMAL. */
  priority?: EventPriority | number;
  /** Where the event originated, e.g. "local" | "supabase-realtime". */
  source?: string;
  /** When true, the event is written to the durable store. */
  persist?: boolean;

  // ---- Stage 1.4: trace correlation ----
  /** Unique id for this execution tree (one per root trace). */
  traceId?: string;
  /** Correlation root — the originating intent id shared across a workflow. */
  correlationId?: string;
  /** Optional workflow this event belongs to. */
  workflowId?: string;
}

export interface EventQueryFilters {
  type?: string;
  stream_id?: string;
  limit?: number;
}
