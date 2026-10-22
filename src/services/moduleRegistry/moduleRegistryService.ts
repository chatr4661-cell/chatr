import { supabase } from '@/integrations/supabase/client';
import type { ModuleDefinition, ModuleLifecycleState, ModuleAuditEntry } from './types';
import { DEFAULT_MODULE_REGISTRY } from './defaultRegistry';
export { DEFAULT_MODULE_REGISTRY } from './defaultRegistry';

const LOCAL_STORAGE_KEY = 'chatr_module_registry_cache_v1';
const LOCAL_AUDIT_KEY = 'chatr_module_audit_cache_v1';

/**
 * Loads cached modules from local storage for fast hydration.
 */
function getCachedModules(): ModuleDefinition[] | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Saves modules to local storage.
 */
function setCachedModules(modules: ModuleDefinition[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(modules));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Loads cached audit logs from local storage.
 */
function getCachedAudit(): ModuleAuditEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_AUDIT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Prepends an audit log entry to local storage.
 */
function appendCachedAudit(entry: ModuleAuditEntry) {
  try {
    const current = getCachedAudit();
    const updated = [entry, ...current].slice(0, 100);
    localStorage.setItem(LOCAL_AUDIT_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Fetches all modules.
 * Queries Supabase `module_registry` if table is available, merging with defaults.
 */
export async function fetchModules(isAdmin: boolean = false): Promise<ModuleDefinition[]> {
  try {
    // Attempt Supabase query
    const { data, error } = await supabase
      .from('module_registry' as any)
      .select('*');

    if (!error && Array.isArray(data) && data.length > 0) {
      const mapped: ModuleDefinition[] = data.map((row: any) => ({
        id: row.id,
        displayName: row.display_name,
        route: row.route,
        lifecycleState: row.lifecycle_state as ModuleLifecycleState,
        isPublic: Boolean(row.is_public),
        requiredPermissions: row.required_permissions || [],
        adminNotes: row.admin_notes || '',
        iconName: row.icon_name || '',
        category: row.category || 'ecosystem',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastUpdatedBy: row.last_updated_by,
        lastUpdatedByPhone: row.last_updated_by_phone
      }));

      // Merge with default modules to ensure all 12 required exist even if DB was partially seeded
      const mergedMap = new Map<string, ModuleDefinition>();
      for (const def of DEFAULT_MODULE_REGISTRY) {
        mergedMap.set(def.id, def);
      }
      for (const item of mapped) {
        mergedMap.set(item.id, item);
      }

      const merged = Array.from(mergedMap.values());
      setCachedModules(merged);
      return merged;
    }
  } catch (err) {
    console.warn('[ModuleRegistry] Supabase query notice, falling back to cache:', err);
  }

  // Fallback to local cache or defaults
  const cached = getCachedModules();
  return (cached && cached.length >= DEFAULT_MODULE_REGISTRY.length)
    ? cached
    : DEFAULT_MODULE_REGISTRY;
}

/**
 * Updates a module's lifecycle state via server-side RPC or fallback.
 */
export async function updateModuleLifecycle(
  moduleId: string,
  newState: ModuleLifecycleState,
  notes: string = ''
): Promise<{ success: boolean; error?: string; updated?: ModuleDefinition }> {
  const adminIdentifier = '9717845477'; // Designated administrator identifier

  try {
    // Attempt database RPC update
    const { data, error } = await supabase.rpc('update_module_lifecycle' as any, {
      p_module_id: moduleId,
      p_new_state: newState,
      p_notes: notes
    });

    if (!error && data) {
      const updated: ModuleDefinition = {
        id: data.id,
        displayName: data.display_name,
        route: data.route,
        lifecycleState: data.lifecycle_state as ModuleLifecycleState,
        isPublic: Boolean(data.is_public),
        requiredPermissions: data.required_permissions || [],
        adminNotes: data.admin_notes || '',
        iconName: data.icon_name || '',
        category: data.category || 'ecosystem',
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        lastUpdatedByPhone: data.last_updated_by_phone
      };

      // Update local cache
      const cached = getCachedModules() || DEFAULT_MODULE_REGISTRY;
      const next = cached.map(m => m.id === moduleId ? updated : m);
      setCachedModules(next);

      return { success: true, updated };
    }
  } catch (err: any) {
    console.warn('[ModuleRegistry] RPC error, updating local cache:', err?.message);
  }

  // Resilient local update
  const cached = getCachedModules() || [...DEFAULT_MODULE_REGISTRY];
  const target = cached.find(m => m.id === moduleId);
  if (!target) {
    return { success: false, error: `Module ${moduleId} not found in registry.` };
  }

  const previousState = target.lifecycleState;
  const now = new Date().toISOString();

  const updated: ModuleDefinition = {
    ...target,
    lifecycleState: newState,
    isPublic: newState === 'published',
    adminNotes: notes ? notes : target.adminNotes,
    updatedAt: now,
    lastUpdatedByPhone: adminIdentifier
  };

  const next = cached.map(m => m.id === moduleId ? updated : m);
  setCachedModules(next);

  // Record audit log
  appendCachedAudit({
    id: `audit-${Date.now()}`,
    moduleId,
    previousState,
    newState,
    adminIdentifier,
    actionResult: 'SUCCESS',
    notes: notes || `Transitioned to ${newState}`,
    createdAt: now
  });

  return { success: true, updated };
}

/**
 * Fetches recent audit history entries.
 */
export async function fetchAuditHistory(moduleId?: string): Promise<ModuleAuditEntry[]> {
  try {
    let query = supabase
      .from('module_lifecycle_audit' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (moduleId) {
      query = query.eq('module_id', moduleId);
    }

    const { data, error } = await query;
    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((r: any) => ({
        id: r.id,
        moduleId: r.module_id,
        previousState: r.previous_state as ModuleLifecycleState,
        newState: r.new_state as ModuleLifecycleState,
        adminUserId: r.admin_user_id,
        adminIdentifier: r.admin_identifier || 'admin',
        actionResult: r.action_result || 'SUCCESS',
        notes: r.notes || '',
        createdAt: r.created_at
      }));
    }
  } catch {
    // Fall back to local audit cache
  }

  const local = getCachedAudit();
  if (moduleId) {
    return local.filter(a => a.moduleId === moduleId);
  }
  return local;
}
