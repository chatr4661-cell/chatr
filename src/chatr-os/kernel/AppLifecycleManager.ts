/**
 * CHATR OS - App Lifecycle Manager
 * 
 * Manages the lifecycle of mini-apps running within CHATR OS.
 * Handles app launch, pause, resume, suspend, and termination.
 * 
 * Week 1 - Core OS Infrastructure
 */

import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';

export type AppLifecycleState = 'installed' | 'running' | 'paused' | 'suspended' | 'terminated';

export interface AppInfo {
  id: string;
  userId: string;
  appName: string;
  packageName: string;
  version: string;
  lifecycleState: AppLifecycleState;
  lastOpenedAt?: string;
  cpuUsageAvg?: number;
  memoryUsagePeak?: number;
  batteryDrainRate?: number;
  storageQuota: number;
  storageUsed: number;
  isSystemApp: boolean;
}

export interface AppSession {
  id: string;
  appId: string;
  userId: string;
  sessionStart: string;
  sessionEnd?: string;
  durationSeconds?: number;
  cpuUsageAvg: number;
  memoryUsagePeak: number;
  batteryDrain: number;
}

interface LifecycleCallbacks {
  onLaunch?: (appId: string) => void | Promise<void>;
  onPause?: (appId: string) => void | Promise<void>;
  onResume?: (appId: string) => void | Promise<void>;
  onSuspend?: (appId: string) => void | Promise<void>;
  onTerminate?: (appId: string) => void | Promise<void>;
}

class AppLifecycleManager {
  private activeApps: Map<string, AppInfo> = new Map();
  private activeSessions: Map<string, AppSession> = new Map();
  private callbacks: Map<string, LifecycleCallbacks> = new Map();
  private resourceMonitorInterval?: NodeJS.Timeout;

  /**
   * Initialize the lifecycle manager
   */
  async initialize() {
    console.log('🚀 CHATR OS: Initializing App Lifecycle Manager');
    
    // Load all user's installed apps
    await this.loadInstalledApps();
    
    // Start resource monitoring
    this.startResourceMonitoring();
    
    // Setup native lifecycle listeners if on mobile
    if (Capacitor.isNativePlatform()) {
      await this.setupNativeListeners();
    }
    
    console.log('✅ App Lifecycle Manager ready');
  }

  /**
   * Load all installed apps for the current user
   */
  private async loadInstalledApps() {
    try {
      const { data: apps, error } = await supabase
        .from('chatr_os_apps')
        .select('*')
        .order('last_opened_at', { ascending: false, nullsFirst: false });

      if (error) throw error;

      if (apps) {
        apps.forEach(app => {
          this.activeApps.set(app.id, {
            id: app.id,
            userId: app.user_id,
            appName: app.app_name,
            packageName: app.package_name,
            version: app.version,
            lifecycleState: app.lifecycle_state as AppLifecycleState,
            lastOpenedAt: app.last_opened_at,
            cpuUsageAvg: app.cpu_usage_avg,
            memoryUsagePeak: app.memory_usage_peak,
            batteryDrainRate: app.battery_drain_rate,
            storageQuota: app.storage_quota,
            storageUsed: app.storage_used,
            isSystemApp: app.is_system_app
          });
        });
        console.log(`📱 Loaded ${apps.length} installed apps`);
      }
    } catch (error) {
      console.error('Failed to load installed apps:', error);
    }
  }

  /**
   * Launch an app
   */
  async launchApp(packageName: string): Promise<AppSession | null> {
    const app = Array.from(this.activeApps.values()).find(
      a => a.packageName === packageName
    );

    if (!app) {
      console.error(`❌ App not found: ${packageName}`);
      return null;
    }

    try {
      // Create a new session
      const { data: session, error } = await supabase
        .from('app_sessions')
        .insert({
          app_id: app.id,
          user_id: app.userId,
          session_start: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      const appSession: AppSession = {
        id: session.id,
        appId: session.app_id,
        userId: session.user_id,
        sessionStart: session.session_start,
        cpuUsageAvg: 0,
        memoryUsagePeak: 0,
        batteryDrain: 0
      };

      this.activeSessions.set(session.id, appSession);

      // Update app state
      await this.updateAppState(app.id, 'running');

      // Call lifecycle callback
      const callback = this.callbacks.get(packageName);
      if (callback?.onLaunch) {
        await callback.onLaunch(app.id);
      }

      console.log(`▶️ Launched app: ${app.appName} (${packageName})`);
      return appSession;
    } catch (error) {
      console.error('Failed to launch app:', error);
      return null;
    }
  }

  /**
   * Pause an app (app goes to background)
   */
  async pauseApp(appId: string) {
    const app = this.activeApps.get(appId);
    if (!app) return;

    await this.updateAppState(appId, 'paused');

    const callback = this.callbacks.get(app.packageName);
    if (callback?.onPause) {
      await callback.onPause(appId);
    }

    console.log(`⏸️ Paused app: ${app.appName}`);
  }

  /**
   * Resume an app (app comes to foreground)
   */
  async resumeApp(appId: string) {
    const app = this.activeApps.get(appId);
    if (!app) return;

    await this.updateAppState(appId, 'running');

    const callback = this.callbacks.get(app.packageName);
    if (callback?.onResume) {
      await callback.onResume(appId);
    }

    console.log(`▶️ Resumed app: ${app.appName}`);
  }

  /**
   * Suspend an app (low memory or battery optimization)
   */
  async suspendApp(appId: string) {
    const app = this.activeApps.get(appId);
    if (!app) return;

    await this.updateAppState(appId, 'suspended');

    const callback = this.callbacks.get(app.packageName);
    if (callback?.onSuspend) {
      await callback.onSuspend(appId);
    }

    console.log(`💤 Suspended app: ${app.appName}`);
  }

  /**
   * Terminate an app (user force closes or system kills)
   */
  async terminateApp(appId: string) {
    const app = this.activeApps.get(appId);
    if (!app) return;

    // End all active sessions for this app
    const sessionsToEnd = Array.from(this.activeSessions.values())
      .filter(s => s.appId === appId);

    for (const session of sessionsToEnd) {
      await this.endSession(session.id);
    }

    await this.updateAppState(appId, 'installed');

    const callback = this.callbacks.get(app.packageName);
    if (callback?.onTerminate) {
      await callback.onTerminate(appId);
    }

    console.log(`🛑 Terminated app: ${app.appName}`);
  }

  /**
   * End a session (when app is closed)
   */
  private async endSession(sessionId: string) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    try {
      await supabase
        .from('app_sessions')
        .update({
          session_end: new Date().toISOString(),
          cpu_usage_avg: session.cpuUsageAvg,
          memory_usage_peak: session.memoryUsagePeak,
          battery_drain: session.batteryDrain
        })
        .eq('id', sessionId);

      this.activeSessions.delete(sessionId);
      console.log(`✅ Ended session: ${sessionId}`);
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  }

  /**
   * Update app lifecycle state in database
   */
  private async updateAppState(appId: string, state: AppLifecycleState) {
    try {
      await supabase
        .from('chatr_os_apps')
        .update({ lifecycle_state: state })
        .eq('id', appId);

      const app = this.activeApps.get(appId);
      if (app) {
        app.lifecycleState = state;
      }
    } catch (error) {
      console.error('Failed to update app state:', error);
    }
  }

  /**
   * Register lifecycle callbacks for an app
   */
  registerCallbacks(packageName: string, callbacks: LifecycleCallbacks) {
    this.callbacks.set(packageName, callbacks);
    console.log(`📝 Registered lifecycle callbacks for ${packageName}`);
  }

  /**
   * Get all running apps
   */
  getRunningApps(): AppInfo[] {
    return Array.from(this.activeApps.values())
      .filter(app => app.lifecycleState === 'running');
  }

  /**
   * Get app by package name
   */
  getApp(packageName: string): AppInfo | undefined {
    return Array.from(this.activeApps.values())
      .find(app => app.packageName === packageName);
  }

  /**
   * Start monitoring resource usage for active sessions
   */
  private startResourceMonitoring() {
    // Monitor every 5 seconds
    this.resourceMonitorInterval = setInterval(() => {
      this.updateResourceMetrics();
    }, 5000);
  }

  /**
   * Update resource metrics for active sessions
   */
  private updateResourceMetrics() {
    // In a real implementation, this would call native code to get actual metrics
    // For now, we'll simulate with placeholder values
    this.activeSessions.forEach((session, sessionId) => {
      // Simulate CPU and memory usage
      session.cpuUsageAvg = Math.random() * 20; // 0-20% CPU
      session.memoryUsagePeak = Math.floor(Math.random() * 100 * 1024 * 1024); // 0-100MB
      session.batteryDrain = Math.random() * 2; // 0-2% per hour
    });
  }

  /**
   * Setup native platform lifecycle listeners (iOS/Android)
   */
  private async setupNativeListeners() {
    // This will be implemented with native Capacitor plugins
    console.log('📱 Native lifecycle listeners ready');
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.resourceMonitorInterval) {
      clearInterval(this.resourceMonitorInterval);
    }
    this.activeApps.clear();
    this.activeSessions.clear();
    this.callbacks.clear();
    console.log('🧹 App Lifecycle Manager destroyed');
  }
}

// Singleton instance
export const appLifecycleManager = new AppLifecycleManager();
