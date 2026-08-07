/**
 * CHATR OS — Connector Framework: core types.
 *
 * Providers are implementation details. Everything the runtime, marketplace and
 * Universal Inbox talk about is a *capability*.
 */

export type Capability =
  | 'email.read'
  | 'email.send'
  | 'email.labels'
  | 'chat.read'
  | 'chat.send'
  | 'chat.threads'
  | 'chat.channels'
  | 'calendar.read'
  | 'calendar.write'
  | 'meetings.create'
  | 'meetings.read'
  | 'files.read'
  | 'files.write'
  | 'contacts.read'
  | 'contacts.write'
  | 'tasks.read'
  | 'tasks.write'
  | 'issues.read'
  | 'issues.write'
  | 'code.repos'
  | 'code.reviews'
  | 'docs.read'
  | 'docs.write'
  | 'crm.read'
  | 'crm.write'
  | 'payments.read'
  | 'payments.write'
  | 'profile.read'
  | 'profile.write';

/** Capability groups drive the capability-first marketplace UI. */
export type CapabilityGroup =
  | 'communication'
  | 'calendar'
  | 'storage'
  | 'professional'
  | 'crm'
  | 'productivity'
  | 'business';

export type Availability = 'available' | 'coming_soon' | 'community';

export type AuthKind = 'oauth2' | 'api_key' | 'basic' | 'imap';

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'needs_reauth'
  | 'error';

export type HealthState = 'unknown' | 'healthy' | 'degraded' | 'failing';

/** Normalized record types written to the unified data model. */
export type RecordType =
  | 'message'
  | 'event'
  | 'file'
  | 'contact'
  | 'task'
  | 'issue'
  | 'repo'
  | 'document'
  | 'deal'
  | 'payment'
  | 'profile';

export interface UnifiedRecord {
  external_id: string;
  record_type: RecordType;
  capability: Capability;
  title?: string | null;
  body?: string | null;
  url?: string | null;
  author?: string | null;
  participants?: unknown[];
  occurred_at?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ConnectorConnection {
  id: string;
  user_id: string;
  connector_id: string;
  display_name: string | null;
  account_label: string | null;
  status: ConnectionStatus;
  health: HealthState;
  capabilities: Capability[];
  scopes: string[];
  last_error: string | null;
  last_synced_at: string | null;
  sync_cursor: Record<string, unknown>;
  settings: Record<string, unknown>;
}

export interface SyncResult {
  capability: Capability;
  fetched: number;
  upserted: number;
  cursor?: Record<string, unknown>;
}

export interface SearchResult {
  records: UnifiedRecord[];
  cursor?: string | null;
}

/** Every connector — Gmail, Slack, Salesforce, GitHub — implements this. */
export interface Connector {
  id: string;
  definition: ConnectorDefinition;
  capabilities: Capability[];
  connect(options?: { accountLabel?: string }): Promise<{ redirectUrl?: string; connectionId?: string }>;
  disconnect(connectionId: string): Promise<void>;
  status(connectionId: string): Promise<{ status: ConnectionStatus; health: HealthState }>;
  sync(connectionId: string, capability?: Capability): Promise<SyncResult[]>;
  search(connectionId: string, query: string, capability?: Capability): Promise<SearchResult>;
  execute(connectionId: string, action: string, payload?: unknown): Promise<unknown>;
}

/** Declarative configuration — a new connector is mostly just this object. */
export interface ConnectorDefinition {
  id: string;
  name: string;
  /** Short user-facing value proposition (what you gain, not the API). */
  summary: string;
  groups: CapabilityGroup[];
  capabilities: Capability[];
  /** Progressive roadmap: capabilities planned but not shipped yet. */
  roadmap?: Partial<Record<'v2' | 'v3', Capability[]>>;
  auth: AuthKind;
  scopes?: string[];
  availability: Availability;
  /** Provider-side API base, proxied server-side. Never called from the client. */
  apiBase?: string;
  /** Webhook support for push-based sync. */
  webhooks?: boolean;
  /** Rate limit hint used by the runtime limiter (requests per minute). */
  rateLimitPerMinute?: number;
  icon?: string;
  brandColor?: string;
}
