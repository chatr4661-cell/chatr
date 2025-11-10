import { useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { toast } from 'sonner';

const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const LAST_SYNC_KEY = 'last_contact_sync';

/**
 * Scheduled contact sync - auto-refresh daily
 * Keeps device contacts in sync with Chatr users
 */
export const useContactSync = (userId?: string) => {
  const performSync = useCallback(async () => {
    if (!userId || !Capacitor.isNativePlatform()) return;

    try {
      console.log('🔄 Starting scheduled contact sync...');

      // Dynamic import to avoid circular dependency
      const { syncContacts } = await import('@/utils/contactSync');
      
      await syncContacts(userId);

      // Update last sync timestamp
      await Preferences.set({
        key: LAST_SYNC_KEY,
        value: Date.now().toString(),
      });

      console.log('✅ Contact sync completed');
    } catch (error) {
      console.error('❌ Contact sync failed:', error);
    }
  }, [userId]);

  // Check if sync is needed and perform it
  const checkAndSync = useCallback(async () => {
    if (!userId) return;

    try {
      const { value } = await Preferences.get({ key: LAST_SYNC_KEY });
      const lastSync = value ? parseInt(value) : 0;
      const timeSinceSync = Date.now() - lastSync;

      if (timeSinceSync >= SYNC_INTERVAL_MS || lastSync === 0) {
        await performSync();
      } else {
        console.log(`⏰ Next sync in ${Math.round((SYNC_INTERVAL_MS - timeSinceSync) / 1000 / 60 / 60)} hours`);
      }
    } catch (error) {
      console.error('Sync check failed:', error);
    }
  }, [userId, performSync]);

  // Set up periodic sync check
  useEffect(() => {
    if (!userId) return;

    // Initial check on mount
    checkAndSync();

    // Check every hour if sync is needed
    const interval = setInterval(checkAndSync, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [userId, checkAndSync]);

  return {
    performSync,
    checkAndSync,
  };
};
