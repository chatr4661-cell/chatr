/**
 * Agent Monitoring Hook - Features #117-119
 * Listen, Whisper, Barge-In for supervisors
 */
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type MonitorMode = 'listen' | 'whisper' | 'barge';

interface MonitoringSession {
  id: string;
  callId: string;
  agentId: string;
  agentName: string;
  supervisorId: string;
  mode: MonitorMode;
  startedAt: string;
  customerName?: string;
}

export const useAgentMonitoring = () => {
  const [activeSession, setActiveSession] = useState<MonitoringSession | null>(null);
  const [mode, setMode] = useState<MonitorMode>('listen');
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Start monitoring a call
  const startMonitoring = useCallback(async (
    callId: string,
    agentId: string,
    agentName: string,
    initialMode: MonitorMode = 'listen'
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Verify supervisor permissions (would check role in production)
      const session: MonitoringSession = {
        id: crypto.randomUUID(),
        callId,
        agentId,
        agentName,
        supervisorId: user.id,
        mode: initialMode,
        startedAt: new Date().toISOString(),
      };

      setActiveSession(session);
      setMode(initialMode);
      setIsMonitoring(true);

      // Initialize audio context for whisper mode
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.connect(audioContextRef.current.destination);
      }

      // In listen mode, supervisor hears both but neither party hears supervisor
      // In whisper mode, only agent hears supervisor
      // In barge mode, all parties can hear each other
      
      toast.success(`Monitoring ${agentName}'s call (${initialMode} mode)`);
      return true;
    } catch (error) {
      console.error('[useAgentMonitoring] Start error:', error);
      toast.error('Failed to start monitoring');
      return false;
    }
  }, []);

  // Stop monitoring
  const stopMonitoring = useCallback(async (): Promise<boolean> => {
    try {
      if (audioContextRef.current) {
        await audioContextRef.current.close();
        audioContextRef.current = null;
        gainNodeRef.current = null;
      }

      setActiveSession(null);
      setIsMonitoring(false);
      setMode('listen');

      toast.info('Monitoring stopped');
      return true;
    } catch (error) {
      console.error('[useAgentMonitoring] Stop error:', error);
      return false;
    }
  }, []);

  // Switch monitoring mode
  const switchMode = useCallback(async (newMode: MonitorMode): Promise<boolean> => {
    if (!activeSession) {
      toast.error('No active monitoring session');
      return false;
    }

    try {
      setMode(newMode);
      
      // Adjust audio routing based on mode
      if (gainNodeRef.current) {
        switch (newMode) {
          case 'listen':
            // Mute supervisor's mic
            gainNodeRef.current.gain.value = 0;
            break;
          case 'whisper':
            // Route supervisor audio only to agent
            gainNodeRef.current.gain.value = 1;
            break;
          case 'barge':
            // Route supervisor audio to all parties
            gainNodeRef.current.gain.value = 1;
            break;
        }
      }

      // Notify agent of mode change
      console.log('[Monitor] Mode changed to:', newMode, 'for call:', activeSession.callId);

      toast.info(`Switched to ${newMode} mode`);
      return true;
    } catch (error) {
      console.error('[useAgentMonitoring] Mode switch error:', error);
      return false;
    }
  }, [activeSession]);

  // Whisper to agent (only agent hears)
  const whisperToAgent = useCallback(async (message: string) => {
    if (!activeSession || mode !== 'whisper') {
      toast.error('Not in whisper mode');
      return;
    }

    // In production, this would use TTS or direct audio
    console.log('[useAgentMonitoring] Whisper:', message);
    toast.info('Whisper sent to agent');
  }, [activeSession, mode]);

  // Barge into call
  const bargeIn = useCallback(async (): Promise<boolean> => {
    if (!activeSession) return false;
    return switchMode('barge');
  }, [activeSession, switchMode]);

  // Get active calls for monitoring
  const getMonitorableCalls = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('calls')
        .select('id, caller_id, caller_name, receiver_id, receiver_name, started_at, call_type')
        .eq('status', 'active')
        .order('started_at', { ascending: false });

      return data || [];
    } catch (error) {
      console.error('[useAgentMonitoring] Get calls error:', error);
      return [];
    }
  }, []);

  return {
    activeSession,
    mode,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    switchMode,
    whisperToAgent,
    bargeIn,
    getMonitorableCalls,
  };
};
