import type {
  Capability,
  Connector,
  ConnectorDefinition,
  ConnectionStatus,
  HealthState,
  SearchResult,
  SyncResult,
} from '../types';
import { callHub } from '../runtime/transport';

/**
 * Connector SDK — turns a declarative ConnectorDefinition into a fully
 * functional Connector. Provider specifics live server-side in connector-hub,
 * so Gmail, Slack, Salesforce and GitHub all plug into the same runtime.
 */
export function createConnector(
  definition: ConnectorDefinition,
  overrides: Partial<Connector> = {},
): Connector {
  const rate = definition.rateLimitPerMinute ?? 60;

  const base: Connector = {
    id: definition.id,
    definition,
    capabilities: definition.capabilities,

    async connect(options) {
      const data = await callHub<{ redirect_url?: string; connection_id?: string }>(
        {
          action: 'oauth_start',
          connector_id: definition.id,
          account_label: options?.accountLabel,
          redirect_to: typeof window !== 'undefined' ? window.location.href : undefined,
        },
        rate,
      );
      return { redirectUrl: data.redirect_url, connectionId: data.connection_id };
    },

    async disconnect(connectionId) {
      await callHub({ action: 'disconnect', connector_id: definition.id, connection_id: connectionId }, rate);
    },

    async status(connectionId) {
      const data = await callHub<{ status: ConnectionStatus; health: HealthState }>(
        { action: 'status', connector_id: definition.id, connection_id: connectionId },
        rate,
      );
      return { status: data.status, health: data.health };
    },

    async sync(connectionId, capability) {
      const data = await callHub<{ results: SyncResult[] }>(
        {
          action: 'sync',
          connector_id: definition.id,
          connection_id: connectionId,
          capability,
        },
        rate,
      );
      return data.results ?? [];
    },

    async search(connectionId, query, capability) {
      const data = await callHub<SearchResult>(
        {
          action: 'search',
          connector_id: definition.id,
          connection_id: connectionId,
          query,
          capability,
        },
        rate,
      );
      return { records: data.records ?? [], cursor: data.cursor ?? null };
    },

    async execute(connectionId, action, payload) {
      return callHub(
        {
          action: 'execute',
          connector_id: definition.id,
          connection_id: connectionId,
          provider_action: action,
          payload,
        },
        rate,
      );
    },
  };

  return { ...base, ...overrides };
}

/** Capabilities shipped now vs. planned — powers honest progressive rollout UI. */
export function capabilityRoadmap(definition: ConnectorDefinition): {
  shipped: Capability[];
  planned: Capability[];
} {
  const planned = [
    ...(definition.roadmap?.v2 ?? []),
    ...(definition.roadmap?.v3 ?? []),
  ];
  return { shipped: definition.capabilities, planned };
}
