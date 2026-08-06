import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ConnectionHealth,
  ConnectionStore,
  ConnectorRegistry,
  OAuthManager,
  SyncEngine,
  type Capability,
  type CapabilityGroup,
  type ConnectorConnection,
} from '@/connectors';

export const CAPABILITY_GROUPS: { id: CapabilityGroup; label: string; blurb: string }[] = [
  { id: 'communication', label: 'Messaging & Email', blurb: 'One inbox for every conversation' },
  { id: 'calendar', label: 'Calendar & Meetings', blurb: 'Every meeting in one timeline' },
  { id: 'storage', label: 'Files & Storage', blurb: 'Search all your files at once' },
  { id: 'professional', label: 'Work & Code', blurb: 'Issues, repos and reviews' },
  { id: 'crm', label: 'Customers & Sales', blurb: 'Pipeline next to the conversation' },
  { id: 'productivity', label: 'Notes & Tasks', blurb: 'Docs and to-dos where you work' },
  { id: 'business', label: 'Payments & Business', blurb: 'Revenue signals in context' },
];

export function useConnectors() {
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [callbackResult, setCallbackResult] = useState<ReturnType<typeof OAuthManager.readCallbackResult>>(null);

  useEffect(() => {
    const result = OAuthManager.readCallbackResult();
    if (result) {
      setCallbackResult(result);
      const url = new URL(window.location.href);
      ['connector_status', 'connector_id', 'connector_error'].forEach((k) => url.searchParams.delete(k));
      window.history.replaceState({}, '', url.toString());
      queryClient.invalidateQueries({ queryKey: ['connector-connections'] });
    }
  }, [queryClient]);

  const connectionsQuery = useQuery({
    queryKey: ['connector-connections'],
    queryFn: () => ConnectionStore.list(),
    staleTime: 30_000,
  });

  const connections = connectionsQuery.data ?? [];

  const byConnector = useMemo(() => {
    const map = new Map<string, ConnectorConnection>();
    connections.forEach((c) => {
      if (!map.has(c.connector_id)) map.set(c.connector_id, c);
    });
    return map;
  }, [connections]);

  const connect = useCallback(async (connectorId: string) => {
    setBusyId(connectorId);
    try {
      await OAuthManager.start(connectorId);
    } finally {
      setBusyId(null);
    }
  }, []);

  const disconnect = useCallback(
    async (connection: ConnectorConnection) => {
      setBusyId(connection.connector_id);
      try {
        await ConnectorRegistry.require(connection.connector_id).disconnect(connection.id);
      } catch {
        await ConnectionStore.remove(connection.id);
      } finally {
        setBusyId(null);
        queryClient.invalidateQueries({ queryKey: ['connector-connections'] });
      }
    },
    [queryClient],
  );

  const sync = useCallback(
    async (connection: ConnectorConnection, capability?: Capability) => {
      setBusyId(connection.connector_id);
      try {
        await SyncEngine.syncConnection(connection, capability);
      } finally {
        setBusyId(null);
        queryClient.invalidateQueries({ queryKey: ['connector-connections'] });
        queryClient.invalidateQueries({ queryKey: ['connector-records'] });
      }
    },
    [queryClient],
  );

  return {
    definitions: ConnectorRegistry.definitions(),
    counts: ConnectorRegistry.counts(),
    connections,
    byConnector,
    isLoading: connectionsQuery.isLoading,
    busyId,
    callbackResult,
    connect,
    disconnect,
    sync,
    health: ConnectionHealth.evaluate,
  };
}

export function useUniversalInbox(options: { capability?: Capability; search?: string } = {}) {
  return useQuery({
    queryKey: ['connector-records', options.capability ?? 'all', options.search ?? ''],
    queryFn: () => SyncEngine.records({ capability: options.capability, search: options.search, limit: 60 }),
    staleTime: 60_000,
  });
}
