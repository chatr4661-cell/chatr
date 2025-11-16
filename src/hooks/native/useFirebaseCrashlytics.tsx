import { useCallback, useEffect } from 'react';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';
import { Capacitor } from '@capacitor/core';

/**
 * Firebase Crashlytics hook
 * Automatic crash reporting for production apps
 */
export const useFirebaseCrashlytics = () => {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Enable crash reporting
      FirebaseCrashlytics.setEnabled({ enabled: true });
    }
  }, []);

  /**
   * Log non-fatal error
   */
  const logError = useCallback(async (error: Error, context?: Record<string, any>) => {
    if (!Capacitor.isNativePlatform()) {
      console.error('Error:', error, context);
      return;
    }

    try {
      // Add context as custom keys
      if (context) {
        for (const [key, value] of Object.entries(context)) {
          await FirebaseCrashlytics.setCustomKey({
            key,
            value: String(value),
            type: 'string'
          });
        }
      }

      // Log the error
      await FirebaseCrashlytics.recordException({
        message: error.message
      });
    } catch (err) {
      console.error('Crashlytics log failed:', err);
    }
  }, []);

  /**
   * Log message/breadcrumb
   */
  const log = useCallback(async (message: string) => {
    if (!Capacitor.isNativePlatform()) {
      console.log('Crashlytics:', message);
      return;
    }

    try {
      await FirebaseCrashlytics.log({ message });
    } catch (error) {
      console.error('Crashlytics log failed:', error);
    }
  }, []);

  /**
   * Set user identifier
   */
  const setUserId = useCallback(async (userId: string) => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await FirebaseCrashlytics.setUserId({ userId });
    } catch (error) {
      console.error('Crashlytics user ID failed:', error);
    }
  }, []);

  /**
   * Set custom key-value pair
   */
  const setCustomKey = useCallback(async (key: string, value: string | number | boolean) => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await FirebaseCrashlytics.setCustomKey({
        key,
        value: String(value),
        type: typeof value === 'number' ? 'int' : 
              typeof value === 'boolean' ? 'boolean' : 'string'
      });
    } catch (error) {
      console.error('Crashlytics custom key failed:', error);
    }
  }, []);

  /**
   * Send unhandled crash report
   */
  const crash = useCallback(async (message?: string) => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await FirebaseCrashlytics.crash({ message: message || 'Test crash' });
    } catch (error) {
      console.error('Crashlytics crash failed:', error);
    }
  }, []);

  /**
   * Check if crashlytics collection is enabled
   */
  const isEnabled = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return false;

    try {
      const { enabled } = await FirebaseCrashlytics.isEnabled();
      return enabled;
    } catch {
      return false;
    }
  }, []);

  return {
    logError,
    log,
    setUserId,
    setCustomKey,
    crash,
    isEnabled
  };
};
