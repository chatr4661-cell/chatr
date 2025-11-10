import { useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * WakeLock to prevent CPU sleep during critical events
 * Essential for incoming calls and active voice/video sessions
 */
export const useWakeLock = () => {
  const acquireWakeLock = useCallback(async (reason: 'call' | 'video' | 'upload' = 'call') => {
    if (!Capacitor.isNativePlatform()) return null;

    try {
      const WakeLock = (window as any).WakeLock;
      if (WakeLock?.acquire) {
        const lock = await WakeLock.acquire(reason);
        console.log(`✅ WakeLock acquired for ${reason}`);
        return lock;
      }

      // Fallback: Web WakeLock API (if supported)
      if ('wakeLock' in navigator) {
        const lock = await (navigator as any).wakeLock.request('screen');
        console.log(`✅ Screen WakeLock acquired for ${reason}`);
        return lock;
      }

      return null;
    } catch (error) {
      console.error('WakeLock acquisition failed:', error);
      return null;
    }
  }, []);

  const releaseWakeLock = useCallback(async (lock: any) => {
    if (!lock) return;

    try {
      const WakeLock = (window as any).WakeLock;
      if (WakeLock?.release) {
        await WakeLock.release(lock);
        console.log('✅ WakeLock released');
      } else if (lock.release) {
        await lock.release();
        console.log('✅ Screen WakeLock released');
      }
    } catch (error) {
      console.error('WakeLock release failed:', error);
    }
  }, []);

  return {
    acquireWakeLock,
    releaseWakeLock,
  };
};
