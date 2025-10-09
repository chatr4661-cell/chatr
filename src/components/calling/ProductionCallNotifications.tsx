import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { IncomingCallScreen } from './IncomingCallScreen';
import ProductionVoiceCall from './ProductionVoiceCall';
import ProductionVideoCall from './ProductionVideoCall';
import { GroupVideoCall } from './GroupVideoCall';
import { GroupVoiceCall } from './GroupVoiceCall';
import { useNavigate } from 'react-router-dom';

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

  const answerCall = async (call: any) => {
    setIncomingCall(null);
    setActiveCall(call);

    await supabase
      .from('calls')
      .update({
        status: 'active',
        started_at: new Date().toISOString()
      })
      .eq('id', call.id);

    toast({
      title: 'Call connected',
      description: `Connected with ${call.caller_name}`,
    });
  };

  const rejectCall = async (call: any) => {
    setIncomingCall(null);

    await supabase
      .from('calls')
      .update({ 
        status: 'ended', 
        ended_at: new Date().toISOString(),
        missed: false  // User actively rejected
      })
      .eq('id', call.id);

    toast({
      title: 'Call declined',
      description: `Declined call from ${call.caller_name}`,
    });
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
    if (!userId) return;
    
    console.log('📞 Setting up production call listener for:', userId);
    
    // Listen for incoming calls
    const incomingChannel = supabase
      .channel(`production-incoming-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'calls',
        filter: `receiver_id=eq.${userId}`
      }, (payload) => {
        const call = payload.new as any;
        
        if (call.status === 'ringing' && !activeCall && !incomingCall) {
          console.log('📱 Incoming call:', call.caller_name);
          setIncomingCall(call);

          toast({
            title: `Incoming ${call.call_type} call`,
            description: `${call.caller_name} is calling...`,
            duration: 30000,
          });
        }
      })
      .subscribe();
    
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
        
        if (call.status === 'ringing' && !activeCall) {
          console.log('📞 Auto-starting outgoing call:', call.receiver_name);
          setActiveCall(call);
        }
      })
      .subscribe();

    // Listen for call updates (ended by other party)
    const updatesChannel = supabase
      .channel(`production-updates-${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'calls'
      }, (payload) => {
        const updatedCall = payload.new as any;
        
        if (updatedCall.status === 'ended') {
          // Check if this is our active call or incoming call
          if (activeCall?.id === updatedCall.id) {
            console.log('🔚 Active call ended by other party');
            setActiveCall(null);
            toast({
              title: "Call ended",
              description: "The call has ended",
            });
          }
          if (incomingCall?.id === updatedCall.id) {
            console.log('🔚 Incoming call cancelled');
            setIncomingCall(null);
            toast({
              title: "Call cancelled",
              description: "The caller ended the call",
            });
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(incomingChannel);
      supabase.removeChannel(outgoingChannel);
      supabase.removeChannel(updatesChannel);
    };
  }, [userId, activeCall, incomingCall]);

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

      {/* Active Voice Call */}
      {activeCall && activeCall.call_type === 'voice' && !activeCall.is_group && (
        <ProductionVoiceCall
          callId={activeCall.id}
          contactName={activeCall.caller_id === userId ? activeCall.receiver_name : activeCall.caller_name}
          contactAvatar={activeCall.caller_id === userId ? activeCall.receiver_avatar : activeCall.caller_avatar}
          isInitiator={activeCall.caller_id === userId}
          partnerId={activeCall.caller_id === userId ? activeCall.receiver_id : activeCall.caller_id}
          onEnd={endActiveCall}
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
          contactAvatar={activeCall.caller_id === userId ? activeCall.receiver_avatar : activeCall.caller_avatar}
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