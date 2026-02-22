/**
 * Call Handoff System
 * 
 * Enables seamless call transfer across devices:
 * - Initiate handoff from current device
 * - Accept handoff on target device
 * - Auto-detect available devices via realtime
 * - Transfer call state (media config, partner info)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface HandoffRequest {
  id: string;
  call_id: string;
  from_device_id: string;
  handoff_token: string;
  call_state: {
    partnerId: string;
    partnerName: string;
    callType: 'voice' | 'video';
    isVideoOn: boolean;
    isMuted: boolean;
    duration: number;
  };
  created_at: string;
}

interface ActiveDevice {
  id: string;
  device_name: string;
  device_type: string;
  is_online: boolean;
  last_active: string;
  active_call_id: string | null;
}

export const useCallHandoff = (currentDeviceFingerprint?: string) => {
  const [incomingHandoff, setIncomingHandoff] = useState<HandoffRequest | null>(null);
  const [availableDevices, setAvailableDevices] = useState<ActiveDevice[]>([]);
  const [isTransferring, setIsTransferring] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  /**
   * Load user's other active devices
   */
  const loadActiveDevices = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data } = await (supabase as any)
      .from('user_devices')
      .select('id, device_name, device_type, is_online, last_active, active_call_id, device_fingerprint')
      .eq('user_id', user.id)
      .gte('last_active', fiveMinAgo)
      .order('last_active', { ascending: false });

    if (data) {
      // Filter out current device
      const others = data.filter((d: any) =>
        d.device_fingerprint !== currentDeviceFingerprint
      );
      setAvailableDevices(others);
    }
  }, [currentDeviceFingerprint]);

  /**
   * Initiate a call handoff to another device
   */
  const initiateHandoff = useCallback(async (
    callId: string,
    targetDeviceId: string | null,
    callState: HandoffRequest['call_state']
  ) => {
    setIsTransferring(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await (supabase as any)
        .from('call_handoffs')
        .insert({
          call_id: callId,
          from_device_id: currentDeviceFingerprint || 'unknown',
          to_device_id: targetDeviceId,
          from_user_id: user.id,
          status: 'pending',
          call_state: callState,
        })
        .select()
        .single();

      if (error) throw error;

      // Broadcast via realtime channel
      const channel = supabase.channel(`handoff:${user.id}`);
      await channel.send({
        type: 'broadcast',
        event: 'call_handoff',
        payload: {
          handoff_id: data.id,
          call_id: callId,
          from_device: currentDeviceFingerprint,
          target_device: targetDeviceId,
          call_state: callState,
          handoff_token: data.handoff_token,
        }
      });

      toast.success('Call transfer initiated — switch to your other device');
      return data.handoff_token;
    } catch (err) {
      console.error('[CallHandoff] Initiate failed:', err);
      toast.error('Failed to transfer call');
      return null;
    } finally {
      setIsTransferring(false);
    }
  }, [currentDeviceFingerprint]);

  /**
   * Accept a handoff on this device
   */
  const acceptHandoff = useCallback(async (handoffId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('call_handoffs')
        .update({
          status: 'accepted',
          to_device_id: currentDeviceFingerprint || 'unknown',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', handoffId)
        .eq('status', 'pending')
        .select('*, call_state')
        .single();

      if (error) throw error;

      setIncomingHandoff(null);
      return data?.call_state || null;
    } catch (err) {
      console.error('[CallHandoff] Accept failed:', err);
      toast.error('Failed to accept call transfer');
      return null;
    }
  }, [currentDeviceFingerprint]);

  /**
   * Reject a handoff
   */
  const rejectHandoff = useCallback(async (handoffId: string) => {
    await (supabase as any)
      .from('call_handoffs')
      .update({ status: 'rejected' })
      .eq('id', handoffId);
    setIncomingHandoff(null);
  }, []);

  /**
   * Subscribe to incoming handoff requests
   */
  useEffect(() => {
    let mounted = true;

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;

      channelRef.current = supabase
        .channel(`handoff:${user.id}`)
        .on('broadcast', { event: 'call_handoff' }, ({ payload }) => {
          // Only show on OTHER devices (not the initiating device)
          if (payload.from_device === currentDeviceFingerprint) return;
          // If targeted to a specific device, check it matches
          if (payload.target_device && payload.target_device !== currentDeviceFingerprint) return;

          setIncomingHandoff({
            id: payload.handoff_id,
            call_id: payload.call_id,
            from_device_id: payload.from_device,
            handoff_token: payload.handoff_token,
            call_state: payload.call_state,
            created_at: new Date().toISOString(),
          });

          // Auto-expire after 30s
          setTimeout(() => {
            if (mounted) setIncomingHandoff(prev =>
              prev?.id === payload.handoff_id ? null : prev
            );
          }, 30000);
        })
        .subscribe();
    };

    setup();

    return () => {
      mounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [currentDeviceFingerprint]);

  return {
    incomingHandoff,
    availableDevices,
    isTransferring,
    initiateHandoff,
    acceptHandoff,
    rejectHandoff,
    loadActiveDevices,
  };
};
