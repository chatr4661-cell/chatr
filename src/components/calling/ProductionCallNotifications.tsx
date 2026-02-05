import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { IncomingCallScreen } from './IncomingCallScreen';
import GSMStyleVoiceCall from './GSMStyleVoiceCall';
import ProductionVideoCall from './ProductionVideoCall';
import { GroupVideoCall } from './GroupVideoCall';
import { GroupVoiceCall } from './GroupVoiceCall';
import { useNavigate } from 'react-router-dom';
import { showNativeIncomingCall, endNativeCall, registerNativeCallHandlers, setupNativeCallUI } from '@/utils/nativeCallUI';

interface ProductionCallNotificationsProps {
  userId: string;
  username: string;
}

export function ProductionCallNotifications({ userId, username }: ProductionCallNotificationsProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [activeCall, setActiveCall] = useState<any>(null);
  const [userCallRingtone, setUserCallRingtone] = useState('/ringtone.mp3');

  // Setup native call UI on mount
  useEffect(() => {
    setupNativeCallUI();
  }, []);

  // Get user's preferred call ringtone
  useEffect(() => {
    const getUserRingtone = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('call_ringtone')
        .eq('id', userId)
        .single();
      
      if (data?.call_ringtone) {
        setUserCallRingtone(data.call_ringtone);
      }
    };

    if (userId) {
      getUserRingtone();
    }
  }, [userId]);

  // Register native call handlers (CallKit/ConnectionService)
  useEffect(() => {
    const cleanup = registerNativeCallHandlers({
      onAnswer: async (callId: string) => {
        console.log('📞 Call answered from native UI:', callId);
        
        // Find the call and answer it
        const { data: call } = await supabase
          .from('calls')
          .select('*')
          .eq('id', callId)
          .single();
        
        if (call) {
          await answerCall(call);
        }
      },
      onReject: async (callId: string) => {
        console.log('📵 Call rejected from native UI:', callId);
        
        const { data: call } = await supabase
          .from('calls')
          .select('*')
          .eq('id', callId)
          .single();
        
        if (call) {
          await rejectCall(call);
        }
      },
      onEnd: async (callId: string) => {
        console.log('☎️ Call ended from native UI:', callId);
        
        if (activeCall?.id === callId) {
          await endActiveCall();
        }
      },
    });

    return cleanup;
  }, [activeCall]);

  const answerCall = async (call: any) => {
    console.log('✅ Answering call instantly:', call.id);
    
    // End native call UI (don't block starting WebRTC)
    void endNativeCall(call.id);

    // Stop ringtone / incoming UI immediately
    setIncomingCall(null);

    // Start call UI immediately (WebRTC will connect as fast as possible)
    setActiveCall(call);

    await supabase
      .from('calls')
      .update({
        status: 'active',
        started_at: new Date().toISOString()
      })
      .eq('id', call.id);

    // Silent - no toast for call connected
  };

  const rejectCall = async (call: any) => {
    // End native call UI
    await endNativeCall(call.id);
    
    setIncomingCall(null);

    await supabase
      .from('calls')
      .update({ 
        status: 'ended', 
        ended_at: new Date().toISOString(),
        missed: false  // User actively rejected
      })
      .eq('id', call.id);

    // Silent - no toast for call declined
  };

  const endActiveCall = async () => {
    if (activeCall) {
      // Update call status in database
      await supabase
        .from('calls')
        .update({ 
          status: 'ended', 
          ended_at: new Date().toISOString() 
        })
        .eq('id', activeCall.id);
      
      console.log('📞 Call ended, returning to previous screen');
    }
    
    // Clear call states
    setActiveCall(null);
    setIncomingCall(null);
  };

  const sendMessage = (call: any) => {
    setIncomingCall(null);
    rejectCall(call);
    // Navigate to chat with caller
    navigate(`/chat?contact=${call.caller_id}`);
  };

  // Listen for incoming and outgoing calls
  useEffect(() => {
    if (!userId) {
      console.log('⚠️ No userId provided to ProductionCallNotifications');
      return;
    }
    
    console.log('📞 [ProductionCallNotifications] Setting up call listeners for user:', userId);
    
    // Listen for incoming calls
    const incomingChannel = supabase
      .channel(`production-incoming-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'calls',
        filter: `receiver_id=eq.${userId}`
      }, async (payload) => {
        const call = payload.new as any;
        console.log('📱 [ProductionCallNotifications] INCOMING CALL:', { 
          id: call.id, 
          from: call.caller_name, 
          type: call.call_type, 
          status: call.status 
        });
        
        if (call.status === 'ringing' && !activeCall && !incomingCall) {
          console.log('✅ Showing incoming call screen');
          
          // Show native incoming call UI (iOS CallKit / Android ConnectionService)
          await showNativeIncomingCall({
            callId: call.id,
            callerName: call.caller_name || 'Unknown',
            callerPhone: call.caller_phone,
            callerAvatar: call.caller_avatar,
            isVideo: call.call_type === 'video',
          });
          
          setIncomingCall(call);

          // Silent - no toast for incoming call (native UI handles it)
        } else {
          console.log('⏭️ Skipping incoming call (already in call)');
        }
      })
      .subscribe((status) => {
        console.log('📞 Incoming channel status:', status);
      });
    
    // Listen for outgoing calls and auto-start them
    const outgoingChannel = supabase
      .channel(`production-outgoing-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'calls',
        filter: `caller_id=eq.${userId}`
      }, (payload) => {
        const call = payload.new as any;
        console.log('📞 [ProductionCallNotifications] OUTGOING CALL:', { 
          id: call.id, 
          to: call.receiver_name, 
          type: call.call_type, 
          status: call.status 
        });
        
        if (call.status === 'ringing' && !activeCall) {
          console.log('✅ Auto-starting outgoing call');
          setActiveCall(call);
        } else {
          console.log('⏭️ Skipping outgoing call (already in call)');
        }
      })
      .subscribe((status) => {
        console.log('📞 Outgoing channel status:', status);
      });

    // Listen for call updates (ended by other party, or call_type changed)
    const updatesChannel = supabase
      .channel(`production-updates-${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'calls'
      }, (payload) => {
        const updatedCall = payload.new as any;
        console.log('🔄 [ProductionCallNotifications] CALL UPDATE:', { 
          id: updatedCall.id, 
          status: updatedCall.status,
          call_type: updatedCall.call_type
        });
        
        if (updatedCall.status === 'ended' || updatedCall.status === 'missed') {
          // Check if this is our active call or incoming call
          if (activeCall?.id === updatedCall.id) {
            console.log('🔚 Active call ended by other party');
            setActiveCall(null);
          }
          if (incomingCall?.id === updatedCall.id) {
            console.log('🔚 Incoming call cancelled by caller');
            setIncomingCall(null);
          }
        }
        
        // Handle call type upgrade (voice to video)
        if (activeCall?.id === updatedCall.id && updatedCall.call_type !== activeCall.call_type) {
          console.log('📹 Call type changed to:', updatedCall.call_type);
          setActiveCall({ ...activeCall, call_type: updatedCall.call_type });
        }
      })
      .subscribe((status) => {
        console.log('📞 Updates channel status:', status);
      });

    return () => {
      console.log('🧹 Cleaning up call channels');
      supabase.removeChannel(incomingChannel);
      supabase.removeChannel(outgoingChannel);
      supabase.removeChannel(updatesChannel);
    };
  }, [userId, activeCall, incomingCall]);

  // Handle voice to video upgrade - this version doesn't have signaling, keeping simple for now
  const handleUpgradeToVideo = async () => {
    if (!activeCall) return;
    
    console.log("📹 Upgrading call to video:", activeCall.id);
    
    // Update call type in database
    await supabase
      .from("calls")
      .update({ call_type: 'video' })
      .eq("id", activeCall.id);
    
    // Update local state to trigger video call UI
    setActiveCall({ ...activeCall, call_type: 'video' });
  };

  return (
    <>
      {/* Incoming Call Screen */}
      {incomingCall && (
        <IncomingCallScreen
          callerName={incomingCall.caller_name}
          callerAvatar={incomingCall.caller_avatar}
          callType={incomingCall.call_type}
          onAnswer={() => answerCall(incomingCall)}
          onReject={() => rejectCall(incomingCall)}
          onSendMessage={() => sendMessage(incomingCall)}
          ringtoneUrl={userCallRingtone}
        />
      )}

      {/* Active Voice Call - GSM Style */}
      {activeCall && activeCall.call_type === 'voice' && !activeCall.is_group && (
        <GSMStyleVoiceCall
          callId={activeCall.id}
          contactName={activeCall.caller_id === userId ? activeCall.receiver_name : activeCall.caller_name}
          contactAvatar={activeCall.caller_id === userId ? activeCall.receiver_avatar : activeCall.caller_avatar}
          isInitiator={activeCall.caller_id === userId}
          partnerId={activeCall.caller_id === userId ? activeCall.receiver_id : activeCall.caller_id}
          onEnd={endActiveCall}
          onSwitchToVideo={handleUpgradeToVideo}
          isIncoming={activeCall.caller_id !== userId}
          incomingVideoRequest={activeCall.incomingVideoRequest}
          pendingVideoUpgrade={activeCall.pendingVideoUpgrade}
        />
      )}

      {/* Group Voice Call */}
      {activeCall && activeCall.call_type === 'voice' && activeCall.is_group && (
        <GroupVoiceCall
          callId={activeCall.id}
          conversationId={activeCall.conversation_id}
          currentUserId={userId}
          currentUsername={username}
          onEnd={endActiveCall}
        />
      )}

      {/* Active Video Call */}
      {activeCall && activeCall.call_type === 'video' && !activeCall.is_group && (
        <ProductionVideoCall
          callId={activeCall.id}
          contactName={activeCall.caller_id === userId ? activeCall.receiver_name : activeCall.caller_name}
          isInitiator={activeCall.caller_id === userId}
          partnerId={activeCall.caller_id === userId ? activeCall.receiver_id : activeCall.caller_id}
          onEnd={endActiveCall}
        />
      )}

      {/* Group Video Call */}
      {activeCall && activeCall.call_type === 'video' && activeCall.is_group && (
        <GroupVideoCall
          callId={activeCall.id}
          conversationId={activeCall.conversation_id}
          currentUserId={userId}
          currentUsername={username}
          onEnd={endActiveCall}
        />
      )}
    </>
  );
}