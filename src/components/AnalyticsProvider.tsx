import React, { useEffect } from 'react';
import { useFirebaseAnalytics } from '@/hooks/native/useFirebaseAnalytics';
import { useFirebaseCrashlytics } from '@/hooks/native/useFirebaseCrashlytics';
import { useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

/**
 * Global Analytics Tracker
 * Tracks all screen views and user interactions
 */
export const AnalyticsProvider = ({ children, userId }: { children: React.ReactNode; userId?: string }) => {
  const location = useLocation();
  const {
    logScreenView,
    logEvent,
    setUserId: setAnalyticsUserId
  } = useFirebaseAnalytics();
  
  const {
    setUserId: setCrashlyticsUserId,
    setCustomKey
  } = useFirebaseCrashlytics();

  // Set user ID for both Analytics and Crashlytics
  useEffect(() => {
    if (userId && Capacitor.isNativePlatform()) {
      setAnalyticsUserId(userId);
      setCrashlyticsUserId(userId);
      setCustomKey('platform', Capacitor.getPlatform());
    }
  }, [userId, setAnalyticsUserId, setCrashlyticsUserId, setCustomKey]);

  // Track screen views
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const screenName = location.pathname.replace('/', '') || 'home';
      logScreenView(screenName);
      setCustomKey('last_screen', screenName);
    }
  }, [location, logScreenView, setCustomKey]);

  // Track page visibility (app state)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        logEvent('app_backgrounded');
      } else {
        logEvent('app_resumed');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [logEvent]);

  return <>{children}</>;
};
