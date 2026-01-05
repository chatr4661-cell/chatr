/**
 * Multi-Device Sync System
 * Manages linked devices and cross-device synchronization
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LinkedDevice {
  id: string;
  device_name: string;
  device_type: string;
  last_active: string;
  is_current: boolean;
  browser?: string;
  os?: string;
  ip_address?: string;
  created_at: string;
}

interface SyncStatus {
  last_sync: string;
  pending_changes: number;
  is_syncing: boolean;
}

export const useMultiDeviceSync = () => {
  const [devices, setDevices] = useState<LinkedDevice[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);

  /**
   * Get device fingerprint
   */
  const getDeviceFingerprint = useCallback(() => {
    const userAgent = navigator.userAgent;
    const screenRes = `${screen.width}x${screen.height}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const language = navigator.language;
    
    // Create a simple hash
    const fingerprint = btoa(`${userAgent}-${screenRes}-${timezone}-${language}`).slice(0, 32);
    return fingerprint;
  }, []);

  /**
   * Detect device info
   */
  const detectDeviceInfo = useCallback(() => {
    const ua = navigator.userAgent;
    
    let deviceType: LinkedDevice['device_type'] = 'web';
    let browser = 'Unknown';
    let os = 'Unknown';

    // Detect OS
    if (/Android/i.test(ua)) {
      os = 'Android';
      deviceType = 'android';
    } else if (/iPhone|iPad|iPod/i.test(ua)) {
      os = 'iOS';
      deviceType = 'ios';
    } else if (/Mac/i.test(ua)) {
      os = 'macOS';
    } else if (/Windows/i.test(ua)) {
      os = 'Windows';
    } else if (/Linux/i.test(ua)) {
      os = 'Linux';
    }

    // Detect Browser
    if (/Chrome/i.test(ua) && !/Edge/i.test(ua)) {
      browser = 'Chrome';
    } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
      browser = 'Safari';
    } else if (/Firefox/i.test(ua)) {
      browser = 'Firefox';
    } else if (/Edge/i.test(ua)) {
      browser = 'Edge';
    }

    // Check if it's a standalone PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      deviceType = 'desktop';
    }

    const deviceName = `${browser} on ${os}`;

    return { deviceType, browser, os, deviceName };
  }, []);

  /**
   * Register current device
   */
  const registerDevice = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const fingerprint = getDeviceFingerprint();
      const deviceInfo = detectDeviceInfo();

      // Check if device already registered
      const { data: existing } = await supabase
        .from('user_devices')
        .select('id')
        .eq('user_id', user.id)
        .eq('device_fingerprint', fingerprint)
        .single();

      if (existing) {
        // Update last active
        await supabase
          .from('user_devices')
          .update({ last_active: new Date().toISOString() })
          .eq('id', existing.id);
        
        setCurrentDeviceId(existing.id);
        return existing.id;
      }

      // Register new device
      const { data: newDevice, error } = await supabase
        .from('user_devices')
        .insert({
          user_id: user.id,
          device_fingerprint: fingerprint,
          device_name: deviceInfo.deviceName,
          device_type: deviceInfo.deviceType,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          last_active: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Device registration failed:', error);
        return null;
      }

      setCurrentDeviceId(newDevice?.id || null);
      toast.success('Device linked successfully');
      return newDevice?.id;
    } catch (error) {
      console.error('Failed to register device:', error);
      return null;
    }
  }, [getDeviceFingerprint, detectDeviceInfo]);

  /**
   * Load linked devices
   */
  const loadDevices = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_devices')
        .select('*')
        .eq('user_id', user.id)
        .order('last_active', { ascending: false });

      if (error) throw error;

      const fingerprint = getDeviceFingerprint();
      const devicesWithCurrent = (data || []).map(device => ({
        ...device,
        is_current: device.device_fingerprint === fingerprint
      }));

      setDevices(devicesWithCurrent);
    } catch (error) {
      console.error('Failed to load devices:', error);
    } finally {
      setLoading(false);
    }
  }, [getDeviceFingerprint]);

  /**
   * Unlink a device
   */
  const unlinkDevice = useCallback(async (deviceId: string) => {
    try {
      const { error } = await supabase
        .from('user_devices')
        .delete()
        .eq('id', deviceId);

      if (error) throw error;

      toast.success('Device unlinked');
      await loadDevices();
    } catch (error) {
      console.error('Failed to unlink device:', error);
      toast.error('Failed to unlink device');
    }
  }, [loadDevices]);

  /**
   * Unlink all other devices (security feature)
   */
  const unlinkAllOtherDevices = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fingerprint = getDeviceFingerprint();

      const { error } = await supabase
        .from('user_devices')
        .delete()
        .eq('user_id', user.id)
        .neq('device_fingerprint', fingerprint);

      if (error) throw error;

      toast.success('All other devices unlinked');
      await loadDevices();
    } catch (error) {
      console.error('Failed to unlink devices:', error);
      toast.error('Failed to unlink devices');
    }
  }, [getDeviceFingerprint, loadDevices]);

  /**
   * Broadcast sync event to other devices
   */
  const broadcastSync = useCallback(async (eventType: string, data: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase.channel(`sync:${user.id}`);
      
      await channel.send({
        type: 'broadcast',
        event: eventType,
        payload: {
          ...data,
          device_id: currentDeviceId,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      console.error('Broadcast failed:', error);
    }
  }, [currentDeviceId]);

  /**
   * Subscribe to sync events from other devices
   */
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupSync = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel(`sync:${user.id}`)
        .on('broadcast', { event: 'message_read' }, ({ payload }) => {
          if (payload.device_id !== currentDeviceId) {
            // Handle message read sync from another device
            console.log('Sync: Message read on another device', payload);
          }
        })
        .on('broadcast', { event: 'message_deleted' }, ({ payload }) => {
          if (payload.device_id !== currentDeviceId) {
            console.log('Sync: Message deleted on another device', payload);
          }
        })
        .on('broadcast', { event: 'conversation_archived' }, ({ payload }) => {
          if (payload.device_id !== currentDeviceId) {
            console.log('Sync: Conversation archived on another device', payload);
          }
        })
        .subscribe();
    };

    setupSync();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [currentDeviceId]);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    registerDevice();
    loadDevices();
  }, [registerDevice, loadDevices]);

  /**
   * Heartbeat to update last_active
   */
  useEffect(() => {
    const interval = setInterval(async () => {
      if (currentDeviceId) {
        await supabase
          .from('user_devices')
          .update({ last_active: new Date().toISOString() })
          .eq('id', currentDeviceId);
      }
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [currentDeviceId]);

  return {
    devices,
    currentDeviceId,
    syncStatus,
    loading,
    loadDevices,
    unlinkDevice,
    unlinkAllOtherDevices,
    broadcastSync,
    registerDevice
  };
};
