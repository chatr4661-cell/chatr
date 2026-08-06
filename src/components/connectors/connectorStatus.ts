import type { ConnectorConnection } from '@/connectors';

/**
 * Presentation-only status model for connector cards.
 * Customers see plain-language states; raw configuration errors
 * (missing env vars, provider stack traces) stay in developer diagnostics.
 */
export type ConnectorUiState =
  | 'setup_required'
  | 'connecting'
  | 'connected'
  | 'syncing'
  | 'action_required'
  | 'failed'
  | 'not_connected';

export interface ConnectorStatusView {
  state: ConnectorUiState;
  label: string;
  hint: string;
  /** Semantic dot colour class. */
  dotClass: string;
  /** True when the raw error is a server-side configuration gap, not a user problem. */
  isConfigIssue: boolean;
  /** Raw provider/config error — developer diagnostics only, never the card body. */
  diagnostic?: string | null;
}

const CONFIG_ERROR = /missing\s+[A-Z0-9_]+|not configured|no api base|client_id|client_secret/i;

export function isConfigurationError(message?: string | null): boolean {
  return !!message && CONFIG_ERROR.test(message);
}

function relativeTime(iso?: string | null): string | null {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return null;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

export function lastSyncLabel(connection?: ConnectorConnection | null): string | null {
  return relativeTime(connection?.last_synced_at ?? null);
}

export function describeConnector(
  connection: ConnectorConnection | undefined,
  options: { busy?: boolean } = {},
): ConnectorStatusView {
  if (!connection) {
    return {
      state: 'not_connected',
      label: 'Not connected',
      hint: 'Connect to enable these capabilities.',
      dotClass: 'bg-muted-foreground/40',
      isConfigIssue: false,
    };
  }

  const configIssue = isConfigurationError(connection.last_error);
  const diagnostic = connection.last_error ?? null;

  if (options.busy) {
    return {
      state: 'syncing',
      label: 'Syncing',
      hint: 'Pulling the latest from this account.',
      dotClass: 'bg-primary',
      isConfigIssue: configIssue,
      diagnostic,
    };
  }

  if (connection.status === 'connecting') {
    return {
      state: 'connecting',
      label: 'Connecting…',
      hint: 'Finishing authorisation with the provider.',
      dotClass: 'bg-primary',
      isConfigIssue: configIssue,
      diagnostic,
    };
  }

  if (configIssue) {
    return {
      state: 'setup_required',
      label: 'Setup required',
      hint: 'Connect to enable email, calendar and AI capabilities.',
      dotClass: 'bg-amber-500',
      isConfigIssue: true,
      diagnostic,
    };
  }

  if (connection.status === 'needs_reauth') {
    return {
      state: 'action_required',
      label: 'Action required',
      hint: 'Authentication expired — reconnect to resume syncing.',
      dotClass: 'bg-orange-500',
      isConfigIssue: false,
      diagnostic,
    };
  }

  if (connection.status === 'error' || connection.health === 'failing') {
    return {
      state: 'failed',
      label: 'Connection failed',
      hint: "Couldn't refresh access. Reconnect to continue.",
      dotClass: 'bg-destructive',
      isConfigIssue: false,
      diagnostic,
    };
  }

  const synced = lastSyncLabel(connection);
  return {
    state: 'connected',
    label: 'Connected',
    hint: synced ? `Last synced ${synced}` : 'Ready — run a first sync.',
    dotClass: connection.health === 'degraded' ? 'bg-amber-500' : 'bg-emerald-500',
    isConfigIssue: false,
    diagnostic,
  };
}
