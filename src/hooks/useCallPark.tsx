/**
 * Call Park & Retrieve Hook - Features #12-13
 * Virtual parking lot for calls
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

interface ParkedCall {
  id: string;
  callId: string;
  parkSlot: string;
  parkedBy: string;
  parkedByName: string;
  callerName: string;
  callerId: string;
  parkedAt: string;
  expiresAt: string;
  callType: 'voice' | 'video';
}

interface QualityMetrics {
  park_slot?: string;
  parked_by?: string;
  parked_by_name?: string;
  parked_at?: string;
  expires_at?: string;
  [key: string]: unknown;
}

export const useCallPark = () => {
  const [parkedCalls, setParkedCalls] = useState<ParkedCall[]>([]);
  const [loading, setLoading] = useState(false);

  const generateParkSlot = useCallback((): string => {
    const usedSlots = parkedCalls.map(p => parseInt(p.parkSlot));
    for (let i = 1; i <= 99; i++) {
      if (!usedSlots.includes(i)) {
        return i.toString().padStart(2, '0');
      }
    }
    return crypto.randomUUID().slice(0, 4);
  }, [parkedCalls]);

  const loadParkedCalls = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .eq('webrtc_state', 'parked')
        .gt('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString());

      if (error) throw error;

      const mapped: ParkedCall[] = (data || []).map(call => {
        const metrics = (call.quality_metrics || {}) as QualityMetrics;
        return {
          id: call.id,
          callId: call.id,
          parkSlot: metrics.park_slot || '00',
          parkedBy: metrics.parked_by || '',
          parkedByName: metrics.parked_by_name || '',
          callerName: call.caller_name || 'Unknown',
          callerId: call.caller_id,
          parkedAt: metrics.parked_at || call.created_at || '',
          expiresAt: metrics.expires_at || new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          callType: call.call_type as 'voice' | 'video',
        };
      });

      setParkedCalls(mapped);
    } catch (error) {
      console.error('Failed to load parked calls:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadParkedCalls();

    const channel = supabase
      .channel('parked-calls')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calls',
          filter: 'webrtc_state=eq.parked',
        },
        () => loadParkedCalls()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadParkedCalls]);

  const parkCall = useCallback(async (callId: string): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, full_name')
        .eq('id', user.id)
        .single();

      const parkSlot = generateParkSlot();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      const metrics: QualityMetrics = {
        park_slot: parkSlot,
        parked_by: user.id,
        parked_by_name: profile?.full_name || profile?.username || 'User',
        parked_at: new Date().toISOString(),
        expires_at: expiresAt,
      };

      const { error } = await supabase
        .from('calls')
        .update({
          webrtc_state: 'parked',
          quality_metrics: metrics as Json
        })
        .eq('id', callId);

      if (error) throw error;

      toast.success(`Call parked at slot ${parkSlot}`);
      return parkSlot;
    } catch (error) {
      console.error('Failed to park call:', error);
      toast.error('Failed to park call');
      return null;
    }
  }, [generateParkSlot]);

  const retrieveCall = useCallback(async (parkSlot: string): Promise<ParkedCall | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const parkedCall = parkedCalls.find(p => p.parkSlot === parkSlot);
      if (!parkedCall) {
        toast.error(`No call in slot ${parkSlot}`);
        return null;
      }

      if (new Date(parkedCall.expiresAt) < new Date()) {
        toast.error('Parked call has expired');
        return null;
      }

      const metrics: QualityMetrics = {
        retrieved_by: user.id,
        retrieved_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('calls')
        .update({
          webrtc_state: 'connecting',
          receiver_id: user.id,
          quality_metrics: metrics as Json
        })
        .eq('id', parkedCall.callId);

      if (error) throw error;

      toast.success(`Retrieved call from slot ${parkSlot}`);
      return parkedCall;
    } catch (error) {
      console.error('Failed to retrieve call:', error);
      toast.error('Failed to retrieve call');
      return null;
    }
  }, [parkedCalls]);

  const retrieveCallById = useCallback(async (callId: string): Promise<ParkedCall | null> => {
    const parkedCall = parkedCalls.find(p => p.callId === callId);
    if (!parkedCall) {
      toast.error('Call not found in parking');
      return null;
    }
    return retrieveCall(parkedCall.parkSlot);
  }, [parkedCalls, retrieveCall]);

  return {
    parkedCalls,
    loading,
    parkCall,
    retrieveCall,
    retrieveCallById,
    refresh: loadParkedCalls,
  };
};
