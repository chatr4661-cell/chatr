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

  // Reliable STUN/TURN servers for maximum compatibility
  return [
    // Google STUN servers (highly reliable, globally distributed)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    
    // Cloudflare STUN (fast, reliable)
    { urls: 'stun:stun.cloudflare.com:3478' },
    
    // Metered.ca TURN servers (free tier - reliable)
    { 
      urls: [
        'turn:a.relay.metered.ca:80',
        'turn:a.relay.metered.ca:80?transport=tcp',
        'turn:a.relay.metered.ca:443',
        'turn:a.relay.metered.ca:443?transport=tcp'
      ],
      username: 'e8dd65c92ae9a3b9bfcbeb6e',
      credential: 'uWdWNmkhvyqTW1QP'
    },
    
    // Xirsys free TURN (backup)
    {
      urls: [
        'turn:fr-turn1.xirsys.com:80?transport=udp',
        'turn:fr-turn1.xirsys.com:3478?transport=tcp'
      ],
      username: '6820e6b6-bcd2-11ef-8ba9-0242ac120004',
      credential: '6820e852-bcd2-11ef-8ba9-0242ac120004'
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

// Fetch ALL existing signals for a call (crucial for late joiners)
export const getSignals = async (callId: string, toUserId: string) => {
  console.log('📥 [getSignals] Fetching past signals:', {
    callId,
    toUserId,
    timestamp: new Date().toISOString()
  });
  
  const { data, error } = await supabase
    .from('webrtc_signals')
    .select('*')
    .eq('call_id', callId)
    .eq('to_user', toUserId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ [getSignals] Error fetching signals:', {
      error,
      callId,
      toUserId
    });
    throw error;
  }
  
  console.log(`📥 [getSignals] Found ${data?.length || 0} past signals:`, 
    data?.map(s => ({
      type: s.signal_type,
      from: s.from_user,
      to: s.to_user,
      created: s.created_at
    }))
  );
  
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

export const subscribeToCallSignals = async (
  callId: string,
  currentUserId: string,
  onSignal: (signal: any) => void
) => {
  console.log('🔔 Subscribing to signals for call:', callId, 'user:', currentUserId);
  
  const channel = supabase
    .channel(`call-${callId}-${currentUserId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'webrtc_signals',
        // Filter only by call_id at database level
        filter: `call_id=eq.${callId}`
      },
      (payload) => {
        // Filter by to_user in the callback to avoid database parsing errors
        if (payload.new.to_user !== currentUserId) {
          console.log('📥 Ignoring signal not meant for this user:', {
            type: payload.new.signal_type,
            from: payload.new.from_user,
            to: payload.new.to_user,
            currentUser: currentUserId
          });
          return;
        }
        
        console.log('📥 Realtime signal received:', {
          type: payload.new.signal_type,
          from: payload.new.from_user,
          to: payload.new.to_user
        });
        onSignal(payload.new);
      }
    )
    .subscribe((status) => {
      console.log('🔔 Subscription status:', status);
    });

  return () => {
    console.log('🔕 Unsubscribing from call signals');
    supabase.removeChannel(channel);
  };
};
