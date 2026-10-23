import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import {
  fetchModules,
  updateModuleLifecycle,
  fetchAuditHistory,
  DEFAULT_MODULE_REGISTRY
} from './moduleRegistryService';
import { runModulePublishPreflight } from './preflightChecks';
import type { ModuleDefinition, ModuleLifecycleState, ModuleAuditEntry, PublishPreflightResult } from './types';

const ROUTE_ALIASES: Record<string, string> = {
  '/emergency-services': '/emergency',
  '/wallet': '/chatr-wallet',
  '/chatrpay': '/chatr-wallet',
  '/studio': '/chatr-studio',
  '/chatr-intelligence': '/chat-ai',
  '/chatr-store': '/native-apps',
  '/apps': '/native-apps',
  '/vendor': '/dhandha',
  '/seller': '/dhandha',
};

export function useModuleRegistry() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [modules, setModules] = useState<ModuleDefinition[]>(DEFAULT_MODULE_REGISTRY);
  const [auditLogs, setAuditLogs] = useState<ModuleAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchModules(isAdmin);
      setModules(data);
      if (isAdmin) {
        const logs = await fetchAuditHistory();
        setAuditLogs(logs);
      }
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!roleLoading) {
      loadData();
    }
  }, [roleLoading, loadData]);

  // Realtime subscription for cross-tab instant synchronization
  useEffect(() => {
    const channel = supabase
      .channel('schema-module-registry-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'module_registry' },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  /**
   * Evaluates if a given route or module ID is visible on consumer dashboard surfaces.
   * - If module is published: visible on dashboard.
   * - If module is hidden, development, testing, or disabled: removed from dashboard, kept in Admin.
   * - If not a registered module: defaults to visible (core app fallback).
   */
  const isModuleVisible = useCallback(
    (routeOrId: string): boolean => {
      const cleanPath = routeOrId.split('?')[0].replace(/\/+$/, '') || '/';
      const canonicalRoute = ROUTE_ALIASES[cleanPath] || cleanPath;

      const mod = modules.find(m => m.id === routeOrId || m.route === cleanPath || m.route === canonicalRoute)
        || DEFAULT_MODULE_REGISTRY.find(m => m.id === routeOrId || m.route === cleanPath || m.route === canonicalRoute);

      if (!mod) {
        // Unmanaged routes remain visible by default so core pages work
        return true;
      }

      // Consumer dashboard surfaces only show published modules.
      // Hidden, dev, testing, or disabled modules are managed inside Admin Module Control Center.
      return mod.lifecycleState === 'published';
    },
    [modules]
  );

  /**
   * Updates lifecycle state with server-side validation and audit logging.
   */
  const updateLifecycle = useCallback(
    async (moduleId: string, newState: ModuleLifecycleState, notes: string = '') => {
      const result = await updateModuleLifecycle(moduleId, newState, notes);
      if (result.success && result.updated) {
        setModules(prev => prev.map(m => m.id === moduleId ? result.updated! : m));
        const updatedLogs = await fetchAuditHistory();
        setAuditLogs(updatedLogs);
      }
      return result;
    },
    []
  );

  /**
   * Runs the 5 pre-flight checks required before publishing.
   */
  const runPreflight = useCallback((module: ModuleDefinition): PublishPreflightResult => {
    return runModulePublishPreflight(module);
  }, []);

  return {
    modules,
    auditLogs,
    loading: loading || roleLoading,
    isAdmin,
    isModuleVisible,
    updateLifecycle,
    runPreflight,
    refresh: loadData
  };
}
