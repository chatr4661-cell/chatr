import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { IncomingCallScreen } from "./IncomingCallScreen";
import ProductionVideoCall from "./ProductionVideoCall";
import ProductionVoiceCall from "./ProductionVoiceCall";
import { useToast } from "@/hooks/use-toast";
import { sendSignal } from "@/utils/webrtcSignaling";

export function GlobalCallListener() {
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [activeCall, setActiveCall] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Get current user and keep session active
    const initAuth = async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUserId(data.user?.id || null);
      
      // Refresh session to prevent logout during call waiting
      await supabase.auth.refreshSession();
    };
    
    initAuth();

    // Subscribe to incoming calls
    const channel = supabase
      .channel('incoming-calls')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calls',
        },
        async (payload) => {
          const call = payload.new;
          console.log('📞 New call detected:', call);
          
          // Check if this call is for the current user
          const { data: userData } = await supabase.auth.getUser();
          const userId = userData.user?.id;
          
          if (userId && call.receiver_id === userId && call.status === 'ringing') {
            console.log('📲 Incoming call for current user!');
            
            // Fetch caller profile
            const { data: callerProfile } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', call.caller_id)
              .single();
            
            setIncomingCall({
              ...call,
              callerName: callerProfile?.username || call.caller_name || 'Unknown',
              callerAvatar: callerProfile?.avatar_url || call.caller_avatar
            });
          }
        }
      )
      .subscribe();

    // Subscribe to call updates (for when call is ended by caller)
    const callUpdatesChannel = supabase
      .channel('call-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
        },
        async (payload) => {
          const call = payload.new;
          
          // If call is ended and we're showing incoming call, dismiss it
          if (call.status === 'ended' && incomingCall?.id === call.id) {
            console.log('📵 Call ended by caller');
            setIncomingCall(null);
            toast({
              title: "Call Ended",
              description: "The caller ended the call",
            });
          }
          
          // If call is active and we're showing incoming call, dismiss it (answered on another device)
          if (call.status === 'active' && incomingCall?.id === call.id) {
            console.log('📱 Call answered on another device');
            setIncomingCall(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(callUpdatesChannel);
    };
  }, [incomingCall]);

  const handleAnswer = async () => {
    if (!incomingCall) return;
    
    console.log('✅ Answering call instantly:', incomingCall.id);
    
    // Immediately transition to active call for instant UI response
    setActiveCall({
      ...incomingCall,
      isInitiator: false,
      partnerId: incomingCall.caller_id
    });
    setIncomingCall(null);
    
    // Update call status in background - NO fake signals, WebRTC will handle it
    supabase
      .from('calls')
      .update({ 
        status: 'active',
        started_at: new Date().toISOString()
      })
      .eq('id', incomingCall.id)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to update call status:', error);
        }
      });
  };

  const handleReject = async () => {
    if (!incomingCall) return;
    
    console.log('❌ Rejecting call:', incomingCall.id);
    
    // Update call status to ended
    await supabase
      .from('calls')
      .update({ 
        status: 'ended',
        ended_at: new Date().toISOString(),
        missed: false
      })
      .eq('id', incomingCall.id);
    
    // Send call-reject signal to caller
    try {
      await sendSignal({
        type: 'answer' as any,
        callId: incomingCall.id,
        data: { rejected: true },
        to: incomingCall.caller_id
      });
    } catch (error) {
      console.error('Failed to send reject signal:', error);
    }
    
    setIncomingCall(null);
    
    toast({
      title: "Call Declined",
      description: `Call from ${incomingCall.callerName} declined`,
    });
  };

  const handleEndCall = async () => {
    if (!activeCall) return;
    
    console.log('📵 Ending active call:', activeCall.id);
    
    // Update call status
    await supabase
      .from('calls')
      .update({ 
        status: 'ended',
        ended_at: new Date().toISOString()
      })
      .eq('id', activeCall.id);
    
    // Send call-end signal to partner
    try {
      await sendSignal({
        type: 'answer' as any,
        callId: activeCall.id,
        data: { ended: true },
        to: activeCall.partnerId
      });
    } catch (error) {
      console.error('Failed to send end signal:', error);
    }
    
    setActiveCall(null);
  };

  // Render incoming call screen
  if (incomingCall && !activeCall) {
    return (
      <IncomingCallScreen
        callerName={incomingCall.callerName}
        callerAvatar={incomingCall.callerAvatar}
        callType={incomingCall.call_type}
        onAnswer={handleAnswer}
        onReject={handleReject}
        ringtoneUrl="/ringtone.mp3"
      />
    );
  }

  // Render active call screen
  if (activeCall) {
    if (activeCall.call_type === 'video') {
      return (
        <ProductionVideoCall
          callId={activeCall.id}
          contactName={activeCall.callerName}
          isInitiator={activeCall.isInitiator}
          partnerId={activeCall.partnerId}
          onEnd={handleEndCall}
        />
      );
    } else {
      return (
        <ProductionVoiceCall
          callId={activeCall.id}
          contactName={activeCall.callerName}
          isInitiator={activeCall.isInitiator}
          partnerId={activeCall.partnerId}
          onEnd={handleEndCall}
        />
      );
    }
  }

  return null;
}
