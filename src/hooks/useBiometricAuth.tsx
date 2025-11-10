import { useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

interface BiometricOptions {
  title?: string;
  subtitle?: string;
  description?: string;
}

/**
 * Biometric authentication (fingerprint/face unlock)
 * For app-level security layer
 */
export const useBiometricAuth = () => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<'fingerprint' | 'face' | 'none'>('none');

  // Check if biometric auth is available
  const checkAvailability = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      setIsAvailable(false);
      return false;
    }

    try {
      const BiometricAuth = (window as any).BiometricAuth;
      if (BiometricAuth?.isAvailable) {
        const result = await BiometricAuth.isAvailable();
        setIsAvailable(result.available);
        setBiometricType(result.biometryType || 'none');
        return result.available;
      }
      return false;
    } catch (error) {
      console.error('Biometric check failed:', error);
      return false;
    }
  }, []);

  // Authenticate using biometrics
  const authenticate = useCallback(async (options: BiometricOptions = {}) => {
    try {
      const BiometricAuth = (window as any).BiometricAuth;
      if (BiometricAuth?.authenticate) {
        const result = await BiometricAuth.authenticate({
          title: options.title || 'Unlock Chatr',
          subtitle: options.subtitle || 'Use biometric to continue',
          description: options.description || 'Verify your identity',
          negativeButtonText: 'Cancel',
        });

        if (result.success) {
          toast.success('Authenticated successfully');
          return true;
        } else {
          toast.error('Authentication failed');
          return false;
        }
      }
      return false;
    } catch (error) {
      console.error('Biometric auth failed:', error);
      toast.error('Authentication error');
      return false;
    }
  }, []);

  return {
    isAvailable,
    biometricType,
    checkAvailability,
    authenticate,
  };
};
