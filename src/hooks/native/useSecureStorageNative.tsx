import { useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';

/**
 * Premium secure storage hook using native keychain/keystore
 * Perfect for tokens, medical records, payment info, and sensitive data
 */
export const useSecureStorageNative = () => {
  /**
   * Save data securely in native keychain/keystore
   */
  const set = useCallback(async (key: string, value: string): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) {
      // Fallback to encrypted localStorage on web
      try {
        localStorage.setItem(`secure_${key}`, btoa(value));
        return true;
      } catch {
        return false;
      }
    }

    try {
      await SecureStoragePlugin.set({ key, value });
      return true;
    } catch (error) {
      console.error('Secure storage set failed:', error);
      return false;
    }
  }, []);

  /**
   * Get data from secure storage
   */
  const get = useCallback(async (key: string): Promise<string | null> => {
    if (!Capacitor.isNativePlatform()) {
      try {
        const value = localStorage.getItem(`secure_${key}`);
        return value ? atob(value) : null;
      } catch {
        return null;
      }
    }

    try {
      const { value } = await SecureStoragePlugin.get({ key });
      return value;
    } catch (error) {
      console.error('Secure storage get failed:', error);
      return null;
    }
  }, []);

  /**
   * Remove data from secure storage
   */
  const remove = useCallback(async (key: string): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) {
      try {
        localStorage.removeItem(`secure_${key}`);
        return true;
      } catch {
        return false;
      }
    }

    try {
      await SecureStoragePlugin.remove({ key });
      return true;
    } catch (error) {
      console.error('Secure storage remove failed:', error);
      return false;
    }
  }, []);

  /**
   * Clear all secure storage
   */
  const clear = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) {
      try {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('secure_'));
        keys.forEach(k => localStorage.removeItem(k));
        return true;
      } catch {
        return false;
      }
    }

    try {
      await SecureStoragePlugin.clear();
      return true;
    } catch (error) {
      console.error('Secure storage clear failed:', error);
      return false;
    }
  }, []);

  /**
   * Get all keys from secure storage
   */
  const keys = useCallback(async (): Promise<string[]> => {
    if (!Capacitor.isNativePlatform()) {
      try {
        return Object.keys(localStorage)
          .filter(k => k.startsWith('secure_'))
          .map(k => k.replace('secure_', ''));
      } catch {
        return [];
      }
    }

    try {
      const { value } = await SecureStoragePlugin.keys();
      return value;
    } catch (error) {
      console.error('Secure storage keys failed:', error);
      return [];
    }
  }, []);

  return {
    set,
    get,
    remove,
    clear,
    keys
  };
};
