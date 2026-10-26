import React, { createContext, useContext, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useNativeAppInitialization } from '@/hooks/useNativeAppInitialization';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAutoContactSync } from '@/hooks/useAutoContactSync';
import { useNativeHaptics } from '@/hooks/useNativeHaptics';
import { useBatteryOptimization } from '@/hooks/useBatteryOptimization';
import { useContactSync } from '@/hooks/useContactSync';
import { useOfflineUploadQueue } from '@/hooks/useOfflineUploadQueue';
import { useGeofencing } from '@/hooks/useGeofencing';
import { useNativeAuthSync } from '@/hooks/useNativeAuthSync';
import { useNativeCallBridge } from '@/hooks/useNativeCallBridge';
import { useAppleNativeFeatures } from '@/hooks/useAppleNativeFeatures';
import { supabase } from '@/integrations/supabase/client';
import { AnalyticsProvider } from './AnalyticsProvider';
import { ChatrOSProvider } from './ChatrOSProvider';
import { MandatoryAppGate } from './MandatoryAppGate';
import { CallAlertPermissionBanner } from './calling/CallAlertPermissionBanner';
import { useSmartNotificationScheduler } from '@/hooks/useSmartNotificationScheduler';
import { BottomNav } from './BottomNav';

interface NativeAppContextType {
  isNative: boolean;
  isOnline: boolean;
  userId?: string;
  haptics: ReturnType<typeof useNativeHaptics>;
}

const NativeAppContext = createContext<NativeAppContextType>({
  isNative: false,
  isOnline: true,
  haptics: {} as any,
});

export const useNativeApp = () => useContext(NativeAppContext);

interface NativeAppProviderProps {
  children: React.ReactNode;
}

export const NativeAppProvider: React.FC<NativeAppProviderProps> = ({ children }) => {
  const [userId, setUserId] = useState<string>();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const isNative = Capacitor.isNativePlatform();

  // Get current user - only once on mount
  useEffect(() => {
    let mounted = true;
    
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (mounted && user?.id) {
        setUserId(user.id);
      }
    };

    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        setUserId(session?.user?.id);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Initialize all native features
  useNativeAppInitialization(userId);
  
  // Apple-like native features (status bar, keyboard sync, back gesture)
  useAppleNativeFeatures();
  
  // Auto-sync contacts
  useAutoContactSync(userId);
  
  // Push notifications
  usePushNotifications(userId);
  
  // Smart automatic notifications (water, food, doctor appointments, lifestyle)
  useSmartNotificationScheduler(userId);
  
  // Battery optimization (critical for background reliability)
  useBatteryOptimization();
  
  // Scheduled contact sync (daily auto-refresh)
  useContactSync(userId);
  
  // Offline upload queue
  const uploadQueue = useOfflineUploadQueue();
  
  // Native haptics
  const haptics = useNativeHaptics();
  
  // Geofencing for location-based notifications
  useGeofencing(userId);
  
  // Sync auth to native Android app (WebAuthBridge)
  useNativeAuthSync();
  
  // Native call bridge (handles answer/reject from native UI)
  useNativeCallBridge();

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Notify Capgo OTA live updater that bundle initialized cleanly (prevents rollback)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      import('@capgo/capacitor-updater')
        .then(({ CapacitorUpdater }) => {
          CapacitorUpdater.notifyAppReady().catch(() => {});
        })
        .catch(() => {});
    }
  }, []);

  // Track standalone display mode on body for responsive layout styling
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkStandalone = () => {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: window-controls-overlay)').matches ||
        (window.navigator as any).standalone === true ||
        navigator.userAgent.includes('Electron') ||
        document.documentElement.classList.contains('native-app');
      if (isStandalone) {
        document.body.dataset.standaloneApp = 'true';
      } else {
        delete document.body.dataset.standaloneApp;
      }
    };
    checkStandalone();
    const mql = window.matchMedia('(display-mode: standalone)');
    mql.addEventListener?.('change', checkStandalone);
    return () => mql.removeEventListener?.('change', checkStandalone);
  }, []);

  const value: NativeAppContextType = React.useMemo(() => ({
    isNative,
    isOnline,
    userId,
    haptics,
  }), [isNative, isOnline, userId, haptics]);

  return (
    <ChatrOSProvider>
      <NativeAppContext.Provider value={value}>
        <AnalyticsProvider userId={userId}>
          <CallAlertPermissionBanner userId={userId} />
          <MandatoryAppGate />
          {children}
          <BottomNav />
        </AnalyticsProvider>
      </NativeAppContext.Provider>
    </ChatrOSProvider>
  );
};
