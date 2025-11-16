import { useCallback, useEffect } from 'react';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { Capacitor } from '@capacitor/core';

/**
 * Firebase Analytics hook
 * Track screens, events, user properties, and conversions
 */
export const useFirebaseAnalytics = () => {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Enable analytics collection
      FirebaseAnalytics.setEnabled({ enabled: true });
    }
  }, []);

  /**
   * Log screen view
   */
  const logScreenView = useCallback(async (screenName: string, screenClass?: string) => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await FirebaseAnalytics.logEvent({
        name: 'screen_view',
        params: {
          screen_name: screenName,
          screen_class: screenClass || screenName
        }
      });
    } catch (error) {
      console.error('Analytics screen view failed:', error);
    }
  }, []);

  /**
   * Log custom event
   */
  const logEvent = useCallback(async (
    eventName: string,
    params?: Record<string, any>
  ) => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await FirebaseAnalytics.logEvent({
        name: eventName,
        params: params || {}
      });
    } catch (error) {
      console.error('Analytics event failed:', error);
    }
  }, []);

  /**
   * Log message sent
   */
  const logMessageSent = useCallback(async (messageType: 'text' | 'image' | 'video' | 'audio') => {
    return logEvent('message_sent', {
      message_type: messageType,
      timestamp: Date.now()
    });
  }, [logEvent]);

  /**
   * Log call started
   */
  const logCallStarted = useCallback(async (callType: 'voice' | 'video', duration?: number) => {
    return logEvent('call_started', {
      call_type: callType,
      duration_seconds: duration,
      timestamp: Date.now()
    });
  }, [logEvent]);

  /**
   * Log mini app interaction
   */
  const logMiniAppUsage = useCallback(async (appId: string, appName: string, action: string) => {
    return logEvent('mini_app_interaction', {
      app_id: appId,
      app_name: appName,
      action,
      timestamp: Date.now()
    });
  }, [logEvent]);

  /**
   * Log appointment booking
   */
  const logAppointmentBooked = useCallback(async (serviceType: string, providerId: string) => {
    return logEvent('appointment_booked', {
      service_type: serviceType,
      provider_id: providerId,
      timestamp: Date.now()
    });
  }, [logEvent]);

  /**
   * Log payment
   */
  const logPayment = useCallback(async (amount: number, currency: string, method: string) => {
    return logEvent('payment_completed', {
      value: amount,
      currency,
      payment_method: method,
      timestamp: Date.now()
    });
  }, [logEvent]);

  /**
   * Set user property
   */
  const setUserProperty = useCallback(async (key: string, value: string) => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await FirebaseAnalytics.setUserProperty({
        key,
        value
      });
    } catch (error) {
      console.error('Analytics user property failed:', error);
    }
  }, []);

  /**
   * Set user ID
   */
  const setUserId = useCallback(async (userId: string) => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await FirebaseAnalytics.setUserId({ userId });
    } catch (error) {
      console.error('Analytics user ID failed:', error);
    }
  }, []);

  return {
    logScreenView,
    logEvent,
    logMessageSent,
    logCallStarted,
    logMiniAppUsage,
    logAppointmentBooked,
    logPayment,
    setUserProperty,
    setUserId
  };
};
