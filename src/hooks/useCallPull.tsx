/**
 * Call Pull & Flip Hook - Features #14-15
 * Seamlessly move calls between devices
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';

interface ActiveDevice {
  id: string;
  type: 'web' | 'mobile' | 'desktop';
  name: string;
  lastSeen: string;
  hasActiveCall: boolean;
  callId?: string;
}

interface PullableCall {
  callId: string;
  deviceId: string;
  deviceName: string;
  contactName: string;
  callType: 'voice' | 'video';
  duration: number;
}

export const useCallPull = () => {
  const [devices, setDevices] = useState<ActiveDevice[]>([]);
  const [pullableCalls, setPullableCalls] = useState<PullableCall[]>([]);
  const [currentDeviceId] = useState(() => 
    localStorage.getItem('chatr_device_id') || (() => {
      const id = crypto.randomUUID();
      localStorage.setItem('chatr_device_id', id);
      return id;
    })()
  );

  // Track active call on this device in localStorage
  const [activeCallId, setActiveCallIdState] = useState<string | null>(
    localStorage.getItem('chatr_active_call_id')
  );

  const setActiveCall = useCallback((callId: string | null) => {
    if (callId) {
      localStorage.setItem('chatr_active_call_id', callId);
    } else {
      localStorage.removeItem('chatr_active_call_id');
    }
    setActiveCallIdState(callId);
  }, []);

  // Register this device
  useEffect(() => {
    const registerDevice = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const deviceType = Capacitor.isNativePlatform() 
        ? 'mobile' 
        : /Mobile|Android|iPhone/i.test(navigator.userAgent) 
          ? 'mobile' 
          : 'web';

      // Store device info in localStorage and broadcast via presence
      const deviceInfo = {
        id: currentDeviceId,
        type: deviceType,
        name: `${deviceType === 'mobile' ? 'Mobile' : 'Web'} - ${navigator.platform}`,
        lastSeen: new Date().toISOString(),
        activeCallId,
      };

      localStorage.setItem('chatr_device_info', JSON.stringify(deviceInfo));
    };

    registerDevice();
    const interval = setInterval(registerDevice, 30000);
    return () => clearInterval(interval);
  }, [currentDeviceId, activeCallId]);

  // Load active calls that can be pulled
  const loadPullableCalls = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get active calls where user is a participant
    const { data: calls } = await supabase
      .from('calls')
      .select('*')
      .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .eq('status', 'active')
      .neq('id', activeCallId || ''); // Exclude current device's call

    if (calls && calls.length > 0) {
      setPullableCalls(calls.map(c => ({
        callId: c.id,
        deviceId: 'other-device',
        deviceName: 'Other device',
        contactName: c.caller_id === user.id ? (c.receiver_name || 'Unknown') : (c.caller_name || 'Unknown'),
        callType: c.call_type as 'voice' | 'video',
        duration: c.duration || 0,
      })));
    } else {
      setPullableCalls([]);
    }
  }, [activeCallId]);

  useEffect(() => {
    loadPullableCalls();
    const interval = setInterval(loadPullableCalls, 10000);
    return () => clearInterval(interval);
  }, [loadPullableCalls]);

  // Pull call from another device to this one
  const pullCall = useCallback(async (callId: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update call to signal this device is taking over
      await supabase
        .from('calls')
        .update({ 
          webrtc_state: 'reconnecting',
          quality_metrics: { 
            pulled_by_device: currentDeviceId,
            pulled_at: new Date().toISOString()
          }
        })
        .eq('id', callId);

      setActiveCall(callId);
      toast.success('Call pulled to this device');
      return true;
    } catch (error) {
      console.error('Failed to pull call:', error);
      toast.error('Failed to pull call');
      return false;
    }
  }, [currentDeviceId, setActiveCall]);

  // Flip call to another device
  const flipCall = useCallback(async (
    callId: string, 
    _targetDeviceId: string
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Mark call as available for pickup on other device
      await supabase
        .from('calls')
        .update({ 
          webrtc_state: 'flip_pending',
          quality_metrics: { 
            flip_from_device: currentDeviceId,
            flip_at: new Date().toISOString()
          }
        })
        .eq('id', callId);

      setActiveCall(null);
      toast.success('Call available on other devices');
      return true;
    } catch (error) {
      console.error('Failed to flip call:', error);
      toast.error('Failed to flip call');
      return false;
    }
  }, [currentDeviceId, setActiveCall]);

  return {
    devices,
    pullableCalls,
    currentDeviceId,
    activeCallId,
    pullCall,
    flipCall,
    setActiveCall,
    refresh: loadPullableCalls,
  };
};
