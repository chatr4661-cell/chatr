/**
 * Core event types for the CHATR event runtime (Stage 1.3 CQRS loop).
 */

export interface CHATREvent {
  /** Optional client-generated id; the store may assign its own on persist. */
  id?: string;
  /** Event type, e.g. "WORKFLOW_STARTED". */
  type: string;
  /** Arbitrary event payload. */
  payload?: any;
  /** Epoch millis when the event was created. */
  timestamp?: number;
  /** Delivery priority (higher = more urgent). Defaults to 1. */
  priority?: number;
  /** Where the event originated, e.g. "local" | "supabase-realtime". */
  source?: string;
  /** When true, the event is written to the durable store. */
  persist?: boolean;
}

export interface EventQueryFilters {
  type?: string;
  stream_id?: string;
  limit?: number;
}
