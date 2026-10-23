/**
 * CHATR OS - LIVE OVER-THE-AIR (OTA) BUNDLE UPDATER
 *
 * Implements the "Hybrid Shell + Live OTA" architecture:
 * 1. Thin Native Shell (Capacitor) compiled once for App Store & Play Store.
 * 2. Instant OTA bundle delivery: downloads web bundle updates in the background.
 * 3. Hot-swaps the bundle on next launch without waiting for App Store/Google Play reviews.
 * 4. Built-in rollback watchdog: automatically reverts to previous stable bundle if new bundle fails to boot.
 * 5. Bypasses browser sandboxes while retaining 100% PWA DX.
 */

import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

export interface OTABundleVersion {
  version: string;
  buildNumber: number;
  downloadUrl: string;
  checksumSha256?: string;
  releaseNotes?: string;
  publishedAt: string;
  isMandatory?: boolean;
}

export interface OTAUpdateStatus {
  isNative: boolean;
  isSupported: boolean;
  currentVersion: string;
  checkingForUpdate: boolean;
  downloadProgress: number; // 0 to 100
  pendingUpdate: OTABundleVersion | null;
  error: string | null;
}

type StatusListener = (status: OTAUpdateStatus) => void;

class LiveOTAUpdater {
  private static instance: LiveOTAUpdater;
  private currentVersion: string = '1.0.0';
  private downloadProgress: number = 0;
  private checking: boolean = false;
  private pendingUpdate: OTABundleVersion | null = null;
  private lastError: string | null = null;
  private listeners: Set<StatusListener> = new Set();
  private isInitialized: boolean = false;

  private constructor() {}

  public static getInstance(): LiveOTAUpdater {
    if (!LiveOTAUpdater.instance) {
      LiveOTAUpdater.instance = new LiveOTAUpdater();
    }
    return LiveOTAUpdater.instance;
  }

  /**
   * Initialize the OTA engine upon app startup.
   * On native devices, notifies the native shell that the current bundle booted successfully (clearing rollback timers).
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    if (!Capacitor.isNativePlatform()) {
      console.log('[OTA Engine] Running in standard Web / PWA environment. Live OTA bypassed.');
      return;
    }

    try {
      // Dynamic import to keep web bundle light and avoid web build breakages
      const { CapacitorUpdater } = await import('@capgo/capacitor-updater');

      // Acknowledge that the current bundle booted successfully (anti-brick watchdog)
      await CapacitorUpdater.notifyAppReady();

      const currentBundle = await CapacitorUpdater.current();
      if (currentBundle && currentBundle.bundle) {
        this.currentVersion = currentBundle.bundle.version || '1.0.0';
      }

      console.log(`[OTA Engine] Native Shell active. Current bundle version: ${this.currentVersion}`);

      // Auto-check for updates on launch (background)
      setTimeout(() => {
        this.checkForUpdates();
      }, 3000);

      // Listen for app state changes (when user opens or returns to Chatr+ from background)
      try {
        const { App } = await import('@capacitor/app');
        App.addListener('appStateChange', (state) => {
          if (state.isActive) {
            console.log('[OTA Engine] App returned to foreground, checking for live bundle updates...');
            this.checkForUpdates();
          }
        });
      } catch (appErr) {
        console.warn('[OTA Engine] App state listener not registered:', appErr);
      }
    } catch (err) {
      console.warn('[OTA Engine] Failed to initialize native CapacitorUpdater plugin:', err);
    }
  }

  public getStatus(): OTAUpdateStatus {
    return {
      isNative: Capacitor.isNativePlatform(),
      isSupported: Capacitor.isNativePlatform(),
      currentVersion: this.currentVersion,
      checkingForUpdate: this.checking,
      downloadProgress: this.downloadProgress,
      pendingUpdate: this.pendingUpdate,
      error: this.lastError
    };
  }

  public subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const status = this.getStatus();
    this.listeners.forEach(fn => fn(status));
  }

  /**
   * Check Supabase or Capgo distribution endpoint for new production bundle
   */
  public async checkForUpdates(): Promise<OTABundleVersion | null> {
    if (!Capacitor.isNativePlatform()) return null;

    this.checking = true;
    this.lastError = null;
    this.notify();

    try {
      // 1. Check Supabase manifest or fallback edge manifest
      let latestBundle: OTABundleVersion | null = null;

      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'live_ota_latest_bundle')
          .maybeSingle();

        if (data?.value && typeof data.value === 'object') {
          latestBundle = data.value as OTABundleVersion;
        }
      } catch (dbErr) {
        // Fallback to static manifest endpoint
        try {
          const res = await fetch('https://chatr.chat/ota/manifest.json', { cache: 'no-store' });
          if (res.ok) {
            latestBundle = await res.json();
          }
        } catch {
          // No update server reachable
        }
      }

      if (latestBundle && latestBundle.version !== this.currentVersion) {
        console.log(`[OTA Engine] New bundle available: ${latestBundle.version} (current: ${this.currentVersion})`);
        this.pendingUpdate = latestBundle;
        this.notify();

        // Automatically download in background if configured
        await this.downloadAndStageUpdate(latestBundle);
        return latestBundle;
      } else {
        console.log('[OTA Engine] App bundle is up to date.');
      }
    } catch (err: any) {
      console.error('[OTA Engine] Check for update failed:', err);
      this.lastError = err?.message || 'Check for update failed';
    } finally {
      this.checking = false;
      this.notify();
    }

    return null;
  }

  /**
   * Download the bundle in background and stage it for next app restart.
   */
  public async downloadAndStageUpdate(bundle: OTABundleVersion): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;

    try {
      const { CapacitorUpdater } = await import('@capgo/capacitor-updater');

      console.log(`[OTA Engine] Downloading bundle ${bundle.version} from ${bundle.downloadUrl}...`);
      
      const newBundle = await CapacitorUpdater.download({
        url: bundle.downloadUrl,
        version: bundle.version,
      });

      if (newBundle) {
        // Set the downloaded bundle as active for NEXT launch
        await CapacitorUpdater.set(newBundle);
        console.log(`[OTA Engine] Bundle ${bundle.version} staged successfully. Will activate on next launch.`);
        return true;
      }
    } catch (err: any) {
      console.error('[OTA Engine] Failed to download or stage OTA bundle:', err);
      this.lastError = err?.message || 'Download failed';
      this.notify();
    }
    return false;
  }

  /**
   * Hot-swap now (reloads WebView with new bundle immediately)
   */
  public async applyUpdateNow(): Promise<void> {
    if (!Capacitor.isNativePlatform() || !this.pendingUpdate) return;

    try {
      const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
      await CapacitorUpdater.reload();
    } catch (err) {
      console.error('[OTA Engine] Error triggering immediate reload:', err);
      window.location.reload();
    }
  }
}

export const liveOTAUpdater = LiveOTAUpdater.getInstance();
