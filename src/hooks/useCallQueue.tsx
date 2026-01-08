/**
 * Call Queue Hook - Feature #28-29
 * Call queuing with callback option
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface QueuedCall {
  id: string;
  callerId: string;
  callerName: string;
  callerPhone?: string;
  queueId: string;
  queueName: string;
  position: number;
  joinedAt: string;
  estimatedWait: number; // seconds
  callbackRequested: boolean;
  callbackNumber?: string;
  priority: 'normal' | 'high' | 'vip';
  skills?: string[];
}

export interface CallQueue {
  id: string;
  name: string;
  description?: string;
  musicOnHold: string;
  maxWaitTime: number; // seconds
  maxQueueSize: number;
  callbackEnabled: boolean;
  announcePosition: boolean;
  announceWait: boolean;
  wrapUpTime: number; // seconds after call
  agents: string[]; // user IDs
  currentCalls: number;
  waitingCalls: number;
}

export const useCallQueue = (queueId?: string) => {
  const [queue, setQueue] = useState<CallQueue | null>(null);
  const [waitingCalls, setWaitingCalls] = useState<QueuedCall[]>([]);
  const [myPosition, setMyPosition] = useState<number | null>(null);
  const [estimatedWait, setEstimatedWait] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const loadQueue = useCallback(async () => {
    if (!queueId) {
      setLoading(false);
      return;
    }

    try {
      // Simulated queue data - in production, this would come from a queue table
      const mockQueue: CallQueue = {
        id: queueId,
        name: queueId === 'sales' ? 'Sales Queue' : 'Support Queue',
        musicOnHold: '/audio/hold-music.mp3',
        maxWaitTime: 600,
        maxQueueSize: 20,
        callbackEnabled: true,
        announcePosition: true,
        announceWait: true,
        wrapUpTime: 30,
        agents: [],
        currentCalls: 0,
        waitingCalls: 0,
      };

      setQueue(mockQueue);
    } catch (error) {
      console.error('[useCallQueue] Load error:', error);
    } finally {
      setLoading(false);
    }
  }, [queueId]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Join queue
  const joinQueue = useCallback(async (
    callerName: string,
    callerPhone?: string,
    priority: 'normal' | 'high' | 'vip' = 'normal'
  ): Promise<QueuedCall | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !queueId) return null;

      const queuedCall: QueuedCall = {
        id: crypto.randomUUID(),
        callerId: user.id,
        callerName,
        callerPhone,
        queueId,
        queueName: queue?.name || 'Queue',
        position: waitingCalls.length + 1,
        joinedAt: new Date().toISOString(),
        estimatedWait: (waitingCalls.length + 1) * 60, // 1 min per caller estimate
        callbackRequested: false,
        priority,
      };

      setWaitingCalls(prev => [...prev, queuedCall]);
      setMyPosition(queuedCall.position);
      setEstimatedWait(queuedCall.estimatedWait);

      toast.info(`You are #${queuedCall.position} in queue`);
      return queuedCall;
    } catch (error) {
      console.error('[useCallQueue] Join error:', error);
      toast.error('Failed to join queue');
      return null;
    }
  }, [queueId, queue, waitingCalls.length]);

  // Leave queue
  const leaveQueue = useCallback(async (callId?: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      setWaitingCalls(prev => prev.filter(c => 
        callId ? c.id !== callId : c.callerId !== user.id
      ));
      setMyPosition(null);
      setEstimatedWait(null);

      toast.info('Left queue');
      return true;
    } catch (error) {
      console.error('[useCallQueue] Leave error:', error);
      return false;
    }
  }, []);

  // Request callback instead of waiting
  const requestCallback = useCallback(async (
    callId: string,
    callbackNumber: string
  ): Promise<boolean> => {
    try {
      if (!queue?.callbackEnabled) {
        toast.error('Callback not available for this queue');
        return false;
      }

      setWaitingCalls(prev => prev.map(c => 
        c.id === callId 
          ? { ...c, callbackRequested: true, callbackNumber }
          : c
      ));

      toast.success('Callback requested! We\'ll call you back shortly.');
      return true;
    } catch (error) {
      console.error('[useCallQueue] Callback request error:', error);
      toast.error('Failed to request callback');
      return false;
    }
  }, [queue]);

  // Get position announcement text
  const getPositionAnnouncement = useCallback((): string => {
    if (!myPosition) return '';
    
    if (myPosition === 1) {
      return 'You are next in line. An agent will be with you shortly.';
    }
    
    const waitMins = Math.ceil((estimatedWait || 0) / 60);
    return `You are number ${myPosition} in queue. Estimated wait: ${waitMins} minutes.`;
  }, [myPosition, estimatedWait]);

  return {
    queue,
    waitingCalls,
    myPosition,
    estimatedWait,
    loading,
    joinQueue,
    leaveQueue,
    requestCallback,
    getPositionAnnouncement,
    reload: loadQueue,
  };
};
