import React, { createContext, useContext, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useNativeAppInitialization } from '@/hooks/useNativeAppInitialization';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAutoContactSync } from '@/hooks/useAutoContactSync';
import { useNativeHaptics } from '@/hooks/useNativeHaptics';
import { useAndroidBackButton } from '@/hooks/useAndroidBackButton';
import { useBatteryOptimization } from '@/hooks/useBatteryOptimization';
import { useContactSync } from '@/hooks/useContactSync';
import { useOfflineUploadQueue } from '@/hooks/useOfflineUploadQueue';
import { useGeofencing } from '@/hooks/useGeofencing';
import { supabase } from '@/integrations/supabase/client';
import { AnalyticsProvider } from './AnalyticsProvider';

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
  
  // Auto-sync contacts
  useAutoContactSync(userId);
  
  // Push notifications
  usePushNotifications(userId);
  
  // Battery optimization (critical for background reliability)
  useBatteryOptimization();
  
  // Scheduled contact sync (daily auto-refresh)
  useContactSync(userId);
  
  // Offline upload queue
  const uploadQueue = useOfflineUploadQueue();
  
  // Native haptics
  const haptics = useNativeHaptics();
  
  // Android back button
  useAndroidBackButton();
  
  // Geofencing for location-based notifications
  useGeofencing(userId);

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

  const value: NativeAppContextType = React.useMemo(() => ({
    isNative,
    isOnline,
    userId,
    haptics,
  }), [isNative, isOnline, userId, haptics]);

  return (
    <NativeAppContext.Provider value={value}>
      <AnalyticsProvider userId={userId}>
        {children}
      </AnalyticsProvider>
    </NativeAppContext.Provider>
  );
};
