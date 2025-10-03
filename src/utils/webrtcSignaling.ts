import { supabase } from '@/integrations/supabase/client';

export interface SignalData {
  type: 'offer' | 'answer' | 'ice-candidate';
  callId: string;
  data: any;
  to: string;
}

export const sendSignal = async (signalData: SignalData) => {
  const { data, error } = await supabase.functions.invoke('webrtc-signaling', {
    body: {
      action: 'send-signal',
      ...signalData
    }
  });

  if (error) throw error;
  return data;
};

export const getSignals = async (callId: string) => {
  const { data, error } = await supabase.functions.invoke('webrtc-signaling', {
    body: {
      action: 'get-signals',
      callId
    }
  });

  if (error) throw error;
  return data.signals || [];
};

export const subscribeToCallSignals = (
  callId: string,
  onSignal: (signal: any) => void
) => {
  const channel = supabase
    .channel(`call-${callId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'webrtc_signals',
        filter: `call_id=eq.${callId}`
      },
      (payload) => {
        onSignal(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
