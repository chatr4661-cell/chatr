/**
 * CHATR OS - Permission Manager
 * 
 * Manages runtime permissions for mini-apps.
 * Controls access to sensitive device features like camera, location, microphone, etc.
 * 
 * Week 1 - Core OS Infrastructure
 */

import { supabase } from '@/integrations/supabase/client';
import { appLifecycleManager } from './AppLifecycleManager';

export type Permission = 
  | 'camera'
  | 'microphone'
  | 'location'
  | 'location_background'
  | 'contacts'
  | 'storage'
  | 'notifications'
  | 'bluetooth'
  | 'calendar'
  | 'phone'
  | 'sms'
  | 'biometric'
  | 'health_data';

export interface AppPermission {
  id: string;
  appId: string;
  userId: string;
  permissionName: Permission;
  granted: boolean;
  grantedAt?: string;
  revokedAt?: string;
  lastUsedAt?: string;
  usageCount: number;
}

export interface PermissionRequest {
  appId: string;
  appName: string;
  permissions: Permission[];
  rationale?: string; // Why the app needs these permissions
}

export interface PermissionResult {
  permission: Permission;
  granted: boolean;
  alreadyGranted: boolean;
}

class PermissionManager {
  private permissionCache: Map<string, Map<Permission, boolean>> = new Map(); // appId -> permission -> granted
  private pendingRequests: Map<string, PermissionRequest> = new Map();

  /**
   * Initialize the permission manager
   */
  async initialize() {
    console.log('🔒 CHATR OS: Initializing Permission Manager');
    
    // Load all granted permissions
    await this.loadGrantedPermissions();
    
    console.log('✅ Permission Manager ready');
  }

  /**
   * Load all granted permissions from database
   */
  private async loadGrantedPermissions() {
    try {
      // Check if user is authenticated first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // No user logged in - this is expected, not an error
        console.log('🔑 Loaded 0 granted permissions');
        return;
      }

      const { data: permissions, error } = await supabase
        .from('app_permissions')
        .select('*')
        .eq('granted', true);

      if (error) {
        // Silently handle permission loading errors for non-authenticated users
        // This can happen during initial load before auth state is ready
        console.log('🔑 Loaded 0 granted permissions');
        return;
      }

      if (permissions) {
        permissions.forEach(perm => {
          let appPerms = this.permissionCache.get(perm.app_id);
          if (!appPerms) {
            appPerms = new Map();
            this.permissionCache.set(perm.app_id, appPerms);
          }
          appPerms.set(perm.permission_name as Permission, true);
        });
        console.log(`🔑 Loaded ${permissions.length} granted permissions`);
      }
    } catch {
      // Silently handle - permissions can be loaded later when user is authenticated
      console.log('🔑 Loaded 0 granted permissions');
    }
  }

  /**
   * Request permissions for an app
   * Returns true if all permissions are granted
   */
  async requestPermissions(
    packageName: string,
    permissions: Permission[],
    rationale?: string
  ): Promise<PermissionResult[]> {
    const app = appLifecycleManager.getApp(packageName);
    if (!app) {
      console.error('❌ App not found:', packageName);
      return permissions.map(p => ({ permission: p, granted: false, alreadyGranted: false }));
    }

    const results: PermissionResult[] = [];

    // Check which permissions are already granted
    const appPerms = this.permissionCache.get(app.id);
    
    for (const permission of permissions) {
      const alreadyGranted = appPerms?.get(permission) || false;
      
      if (alreadyGranted) {
        // Permission already granted
        results.push({
          permission,
          granted: true,
          alreadyGranted: true
        });
      } else {
        // Need to request permission
        // In a real implementation, this would show a permission dialog
        // For now, we'll auto-grant for development
        const granted = await this.grantPermission(app.id, permission);
        results.push({
          permission,
          granted,
          alreadyGranted: false
        });
      }
    }

    console.log(`🔐 Permission request for ${app.appName}:`, results);
    return results;
  }

  /**
   * Grant a permission to an app
   */
  async grantPermission(appId: string, permission: Permission): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Insert or update permission
      const { error } = await supabase
        .from('app_permissions')
        .upsert({
          app_id: appId,
          user_id: user.id,
          permission_name: permission,
          granted: true,
          granted_at: new Date().toISOString()
        });

      if (error) throw error;

      // Update cache
      let appPerms = this.permissionCache.get(appId);
      if (!appPerms) {
        appPerms = new Map();
        this.permissionCache.set(appId, appPerms);
      }
      appPerms.set(permission, true);

      console.log(`✅ Granted permission: ${permission} to app ${appId}`);
      return true;
    } catch (error) {
      console.error('Failed to grant permission:', error);
      return false;
    }
  }

  /**
   * Revoke a permission from an app
   */
  async revokePermission(appId: string, permission: Permission): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Update permission to revoked
      const { error } = await supabase
        .from('app_permissions')
        .update({
          granted: false,
          revoked_at: new Date().toISOString()
        })
        .eq('app_id', appId)
        .eq('permission_name', permission);

      if (error) throw error;

      // Update cache
      const appPerms = this.permissionCache.get(appId);
      if (appPerms) {
        appPerms.set(permission, false);
      }

      console.log(`🚫 Revoked permission: ${permission} from app ${appId}`);
      return true;
    } catch (error) {
      console.error('Failed to revoke permission:', error);
      return false;
    }
  }

  /**
   * Check if an app has a specific permission
   */
  async hasPermission(packageName: string, permission: Permission): Promise<boolean> {
    const app = appLifecycleManager.getApp(packageName);
    if (!app) return false;

    const appPerms = this.permissionCache.get(app.id);
    return appPerms?.get(permission) || false;
  }

  /**
   * Get all granted permissions for an app
   */
  async getAppPermissions(packageName: string): Promise<AppPermission[]> {
    const app = appLifecycleManager.getApp(packageName);
    if (!app) return [];

    try {
      const { data: permissions, error } = await supabase
        .from('app_permissions')
        .select('*')
        .eq('app_id', app.id);

      if (error) throw error;

      return permissions.map(p => ({
        id: p.id,
        appId: p.app_id,
        userId: p.user_id,
        permissionName: p.permission_name as Permission,
        granted: p.granted,
        grantedAt: p.granted_at,
        revokedAt: p.revoked_at,
        lastUsedAt: p.last_used_at,
        usageCount: p.usage_count
      }));
    } catch (error) {
      console.error('Failed to get app permissions:', error);
      return [];
    }
  }

  /**
   * Record permission usage
   */
  async recordPermissionUsage(packageName: string, permission: Permission) {
    const app = appLifecycleManager.getApp(packageName);
    if (!app) return;

    try {
      // First get current usage count
      const { data: currentPerm } = await supabase
        .from('app_permissions')
        .select('usage_count')
        .eq('app_id', app.id)
        .eq('permission_name', permission)
        .single();

      const newCount = (currentPerm?.usage_count || 0) + 1;

      await supabase
        .from('app_permissions')
        .update({
          last_used_at: new Date().toISOString(),
          usage_count: newCount
        })
        .eq('app_id', app.id)
        .eq('permission_name', permission);

      console.log(`📊 Recorded usage: ${app.appName} used ${permission}`);
    } catch (error) {
      console.error('Failed to record permission usage:', error);
    }
  }

  /**
   * Get permission description/rationale
   */
  getPermissionDescription(permission: Permission): string {
    const descriptions: Record<Permission, string> = {
      camera: 'Access your camera to take photos and videos',
      microphone: 'Record audio for voice messages and calls',
      location: 'Access your location for location-based features',
      location_background: 'Track your location in the background',
      contacts: 'Access your contacts to find friends',
      storage: 'Store and access files on your device',
      notifications: 'Show notifications',
      bluetooth: 'Connect to Bluetooth devices',
      calendar: 'Access your calendar events',
      phone: 'Make and manage phone calls',
      sms: 'Send and receive text messages',
      biometric: 'Use fingerprint or face unlock',
      health_data: 'Access your health and fitness data'
    };
    return descriptions[permission] || 'Access device feature';
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.permissionCache.clear();
    this.pendingRequests.clear();
    console.log('🧹 Permission Manager destroyed');
  }
}

// Singleton instance
export const permissionManager = new PermissionManager();
