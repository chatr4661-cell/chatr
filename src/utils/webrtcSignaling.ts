import { supabase } from '@/integrations/supabase/client';

export interface SignalData {
  type: 'offer' | 'answer' | 'ice-candidate';
  callId: string;
  data: any;
  to: string;
}

// Get TURN server configuration
export const getTurnConfig = async () => {
  try {
    // Try to get Twilio TURN credentials first
    const { data, error } = await supabase.functions.invoke('get-turn-credentials');
    
    if (!error && data?.iceServers) {
      console.log('✅ Using Twilio TURN servers');
      return data.iceServers;
    }
  } catch (error) {
    console.log('ℹ️ Twilio TURN not available, using fallback');
  }

  // Fallback to public TURN servers
  return [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { 
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ];
};

// Direct signaling through Supabase Realtime (no edge function)
export const sendSignalDirect = async (signalData: SignalData) => {
  const user = await supabase.auth.getUser();
  const { error } = await supabase
    .from('webrtc_signals')
    .insert([{
      call_id: signalData.callId,
      from_user: user.data.user?.id || '',
      to_user: signalData.to,
      signal_type: signalData.type,
      signal_data: signalData.data as any
    }]);

  if (error) throw error;
};

export const sendSignal = sendSignalDirect;

export const getSignals = async (callId: string) => {
  const { data, error } = await supabase
    .from('webrtc_signals')
    .select('*')
    .eq('call_id', callId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const subscribeToCallSignals = (
  callId: string,
  onSignal: (signal: any) => void
) => {
  const channel = supabase
    .channel(`call-${callId}-realtime`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'webrtc_signals',
        filter: `call_id=eq.${callId}`
      },
      (payload) => {
        console.log('📥 Realtime signal received:', payload.new.signal_type);
        onSignal(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
