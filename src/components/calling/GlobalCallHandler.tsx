import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';
import { IncomingCallOverlay } from './IncomingCallOverlay';
import { FaceTimeCallUI } from './FaceTimeCallUI';
import { toast } from 'sonner';

interface IncomingCall {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  callType: 'audio' | 'video';
}

interface ActiveCall {
  callId: string;
  isVideo: boolean;
  isIncoming: boolean;
  contactName: string;
  contactAvatar?: string;
}

/**
 * Global call handler - manages all incoming and outgoing calls
 * Renders at app root to ensure calls work from any screen
 */
export const GlobalCallHandler: React.FC = () => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setCurrentUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Subscribe to incoming calls
  useEffect(() => {
    if (!currentUserId) return;

    // Skip on native - let TelecomManager handle it
    if (Capacitor.isNativePlatform()) {
      console.log('🔇 Native platform - deferring to TelecomManager');
      return;
    }

    console.log('📞 Setting up call listener for:', currentUserId);

    const channel = supabase
      .channel(`incoming-calls-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calls',
          filter: `receiver_id=eq.${currentUserId}`,
        },
        async (payload) => {
          const call = payload.new as any;
          
          if (call.status !== 'ringing') return;
          if (activeCall || incomingCall) return;

          console.log('📲 Incoming call:', call);

          // Get caller profile
          const { data: callerProfile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', call.caller_id)
            .single();

          setIncomingCall({
            callId: call.id,
            callerId: call.caller_id,
            callerName: callerProfile?.username || 'Unknown',
            callerAvatar: callerProfile?.avatar_url,
            callType: call.call_type || 'audio',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, activeCall, incomingCall]);

  // Listen for call status changes (for native answer handling)
  useEffect(() => {
    if (!currentUserId || !Capacitor.isNativePlatform()) return;

    const channel = supabase
      .channel(`call-status-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
          filter: `receiver_id=eq.${currentUserId}`,
        },
        async (payload) => {
          const call = payload.new as any;
          
          // If call was answered via native UI, establish WebRTC
          if (call.status === 'active' && !activeCall) {
            const { data: callerProfile } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', call.caller_id)
              .single();

            setActiveCall({
              callId: call.id,
              isVideo: call.call_type === 'video',
              isIncoming: true,
              contactName: callerProfile?.username || 'Unknown',
              contactAvatar: callerProfile?.avatar_url,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, activeCall]);

  const handleAnswer = useCallback(async () => {
    if (!incomingCall) return;

    // Update call status
    await supabase
      .from('calls')
      .update({
        status: 'active',
        answered_at: new Date().toISOString(),
      })
      .eq('id', incomingCall.callId);

    setActiveCall({
      callId: incomingCall.callId,
      isVideo: incomingCall.callType === 'video',
      isIncoming: true,
      contactName: incomingCall.callerName,
      contactAvatar: incomingCall.callerAvatar,
    });
    setIncomingCall(null);
  }, [incomingCall]);

  const handleDecline = useCallback(async () => {
    if (!incomingCall) return;

    await supabase
      .from('calls')
      .update({
        status: 'rejected',
        ended_at: new Date().toISOString(),
      })
      .eq('id', incomingCall.callId);

    setIncomingCall(null);
    toast.info('Call declined');
  }, [incomingCall]);

  const handleEndCall = useCallback(async () => {
    if (!activeCall) return;

    await supabase
      .from('calls')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
      })
      .eq('id', activeCall.callId);

    setActiveCall(null);
  }, [activeCall]);

  return (
    <>
      {/* Incoming call overlay */}
      <IncomingCallOverlay
        isVisible={!!incomingCall}
        callId={incomingCall?.callId || ''}
        callerName={incomingCall?.callerName || ''}
        callerAvatar={incomingCall?.callerAvatar}
        callType={incomingCall?.callType || 'audio'}
        onAnswer={handleAnswer}
        onDecline={handleDecline}
      />

      {/* Active call UI */}
      {activeCall && (
        <FaceTimeCallUI
          callId={activeCall.callId}
          isVideo={activeCall.isVideo}
          isIncoming={activeCall.isIncoming}
          contactName={activeCall.contactName}
          contactAvatar={activeCall.contactAvatar}
          onEnd={handleEndCall}
        />
      )}
    </>
  );
};
