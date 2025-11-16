import { useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { NativeBiometric, BiometryType } from 'capacitor-native-biometric';
import { toast } from 'sonner';

interface BiometricCredentials {
  username: string;
  password: string;
}

/**
 * Premium biometric authentication hook
 * Supports fingerprint, Face ID, and secure credential storage
 */
export const useNativeBiometric = () => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometryType | null>(null);

  /**
   * Check if biometric authentication is available
   */
  const checkAvailability = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    try {
      const result = await NativeBiometric.isAvailable();
      setIsAvailable(result.isAvailable);
      setBiometricType(result.biometryType);
      return result.isAvailable;
    } catch (error) {
      console.error('Biometric check failed:', error);
      return false;
    }
  }, []);

  /**
   * Authenticate with biometrics
   */
  const authenticate = useCallback(async (reason: string = 'Authenticate to continue') => {
    try {
      await NativeBiometric.verifyIdentity({
        reason,
        title: 'Chatr+ Authentication',
        subtitle: 'Verify your identity',
        description: reason
      });
      
      toast.success('Authentication successful');
      return true;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      toast.error('Authentication failed');
      return false;
    }
  }, []);

  /**
   * Save credentials securely with biometric protection
   */
  const saveCredentials = useCallback(async (username: string, password: string, server: string = 'chatr-app') => {
    try {
      await NativeBiometric.setCredentials({
        username,
        password,
        server
      });
      
      toast.success('Credentials saved securely');
      return true;
    } catch (error) {
      console.error('Failed to save credentials:', error);
      toast.error('Failed to save credentials');
      return false;
    }
  }, []);

  /**
   * Retrieve saved credentials with biometric authentication
   */
  const getCredentials = useCallback(async (server: string = 'chatr-app'): Promise<BiometricCredentials | null> => {
    try {
      const credentials = await NativeBiometric.getCredentials({ server });
      return credentials;
    } catch (error) {
      console.error('Failed to retrieve credentials:', error);
      return null;
    }
  }, []);

  /**
   * Delete saved credentials
   */
  const deleteCredentials = useCallback(async (server: string = 'chatr-app') => {
    try {
      await NativeBiometric.deleteCredentials({ server });
      toast.success('Credentials deleted');
      return true;
    } catch (error) {
      console.error('Failed to delete credentials:', error);
      return false;
    }
  }, []);

  return {
    isAvailable,
    biometricType,
    checkAvailability,
    authenticate,
    saveCredentials,
    getCredentials,
    deleteCredentials
  };
};
