import React, { createContext, useContext, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useNativeAppInitialization } from '@/hooks/useNativeAppInitialization';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAutoContactSync } from '@/hooks/useAutoContactSync';
import { useNativeHaptics } from '@/hooks/useNativeHaptics';
import { useAndroidBackButton } from '@/hooks/useAndroidBackButton';
import { supabase } from '@/integrations/supabase/client';

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

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };

    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user?.id);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Initialize all native features
  useNativeAppInitialization(userId);
  
  // Auto-sync contacts
  useAutoContactSync(userId);
  
  // Push notifications
  usePushNotifications(userId);
  
  // Native haptics
  const haptics = useNativeHaptics();
  
  // Android back button
  useAndroidBackButton();

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

  const value: NativeAppContextType = {
    isNative,
    isOnline,
    userId,
    haptics,
  };

  return (
    <NativeAppContext.Provider value={value}>
      {children}
    </NativeAppContext.Provider>
  );
};
