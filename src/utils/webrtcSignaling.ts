import { supabase } from '@/integrations/supabase/client';

export interface SignalData {
  type: 'offer' | 'answer' | 'ice-candidate';
  callId: string;
  data: any;
  to: string;
}

// Get TURN server configuration with extensive fallback
export const getTurnConfig = async () => {
  try {
    const { data, error } = await supabase.functions.invoke('get-turn-credentials');
    
    if (!error && data?.iceServers) {
      console.log('✅ Using edge function TURN servers');
      return data.iceServers;
    }
  } catch (error) {
    console.log('ℹ️ Edge function unavailable, using public TURN');
  }

  // Comprehensive public TURN/STUN servers for maximum compatibility
  return [
    // Google STUN servers (multiple for redundancy)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    
    // OpenRelay TURN servers (free, multiple ports)
    { 
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    
    // Additional STUN servers for better NAT traversal
    { urls: 'stun:global.stun.twilio.com:3478' },
    { urls: 'stun:stun.stunprotocol.org:3478' }
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

// Fetch ALL existing signals for a call (crucial for late joiners)
export const getSignals = async (callId: string, toUserId: string) => {
  console.log('📥 Fetching past signals for callId:', callId, 'toUser:', toUserId);
  
  const { data, error } = await supabase
    .from('webrtc_signals')
    .select('*')
    .eq('call_id', callId)
    .eq('to_user', toUserId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Error fetching signals:', error);
    throw error;
  }
  
  console.log(`📥 Found ${data?.length || 0} past signals`);
  return data || [];
};

// Delete processed signals to keep table clean
export const deleteProcessedSignals = async (callId: string, toUserId: string) => {
  await supabase
    .from('webrtc_signals')
    .delete()
    .eq('call_id', callId)
    .eq('to_user', toUserId);
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
