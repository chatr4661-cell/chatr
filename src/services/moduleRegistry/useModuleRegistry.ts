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
   * Evaluates if a given route or module ID is visible to the current visitor.
   * - If module is published: visible to all users.
   * - If module is development: visible ONLY to admin.
   * - If module is testing: visible to admin or tester.
   * - If module is hidden or disabled: hidden from public.
   * - If not a registered module: defaults to visible (core fallback).
   */
  const isModuleVisible = useCallback(
    (routeOrId: string): boolean => {
      // Find matching module by id or route
      const cleanPath = routeOrId.split('?')[0].replace(/\/+$/, '') || '/';
      const mod = modules.find(m => m.id === routeOrId || m.route === cleanPath || m.route === routeOrId);

      if (!mod) {
        // Unmanaged routes remain visible by default so core pages work
        return true;
      }

      switch (mod.lifecycleState) {
        case 'published':
          return true;
        case 'development':
          return Boolean(isAdmin);
        case 'testing':
          return Boolean(isAdmin);
        case 'hidden':
        case 'disabled':
        default:
          return false;
      }
    },
    [modules, isAdmin]
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
