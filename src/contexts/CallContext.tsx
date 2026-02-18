import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';

type CallStatus = 'idle' | 'ringing' | 'connecting' | 'active' | 'reconnecting' | 'ended';
type CallType = 'voice' | 'video';

interface CallData {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerAvatar?: string;
  partnerPhone?: string;
  callType: CallType;
  isInitiator: boolean;
  status: CallStatus;
  startTime?: Date;
  preAcquiredStream?: MediaStream | null;
}

interface CallContextType {
  // Current call state
  activeCall: CallData | null;
  incomingCall: CallData | null;
  
  // Actions - can be called from ANY screen
  initiateCall: (params: {
    partnerId: string;
    partnerName: string;
    partnerAvatar?: string;
    partnerPhone?: string;
    callType: CallType;
    conversationId?: string;
  }) => Promise<string | null>;
  
  answerCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
  
  // Call state helpers
  isInCall: boolean;
  hasIncomingCall: boolean;
}

const CallContext = createContext<CallContextType | null>(null);

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) {
    throw new Error('useCall must be used within CallProvider');
  }
  return ctx;
}

// Singleton to prevent duplicate media requests
let mediaAcquisitionInProgress = false;

export function CallProvider({ children }: { children: React.ReactNode }) {
  const [activeCall, setActiveCall] = useState<CallData | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallData | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  const activeCallRef = useRef(activeCall);
  const incomingCallRef = useRef(incomingCall);
  
  useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);
  useEffect(() => { incomingCallRef.current = incomingCall; }, [incomingCall]);
  
  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);
  
  const isNative = Capacitor.isNativePlatform();

  // NOTE: Incoming call subscriptions are handled exclusively by GlobalCallListener.
  // CallContext only provides shared state (answerCall, rejectCall, endCall).
  // DO NOT add a second incoming-calls subscription here — it causes duplicate ringing.

  // Subscribe to call status updates (for both initiator and receiver)
  useEffect(() => {
    if (!userId) return;
    
    const channel = supabase
      .channel(`call-ctx-updates:${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'calls',
      }, (payload) => {
        const call = payload.new as any;
        
        // Handle call ended by partner
        if (activeCallRef.current?.id === call.id) {
          if (call.status === 'ended' || call.status === 'missed') {
            setActiveCall(null);
            // Silent - no toast for call ended
          }
        }
        
        // Handle incoming call cancelled
        if (incomingCallRef.current?.id === call.id) {
          if (call.status === 'ended' || call.status === 'missed') {
            setIncomingCall(null);
            // Silent - no toast for call cancelled
          }
        }
      })
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  /**
   * INITIATE CALL - Can be called from ANY screen
   */
  const initiateCall = useCallback(async (params: {
    partnerId: string;
    partnerName: string;
    partnerAvatar?: string;
    partnerPhone?: string;
    callType: CallType;
    conversationId?: string;
  }): Promise<string | null> => {
    if (!userId) {
      toast.error('Please log in to make calls');
      return null;
    }
    
    if (activeCallRef.current) {
      toast.warning('Already in a call');
      return null;
    }
    
    if (mediaAcquisitionInProgress) {
      console.log('[CallContext] Media acquisition in progress, skipping duplicate');
      return null;
    }
    
    try {
      mediaAcquisitionInProgress = true;
      
      // Pre-acquire media UNDER USER GESTURE
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: params.callType === 'video',
      });
      
      // Get or create conversation
      let convId = params.conversationId;
      if (!convId) {
        const { data: existing } = await supabase
          .from('conversations')
          .select('id')
          .or(`and(participant_1.eq.${userId},participant_2.eq.${params.partnerId}),and(participant_1.eq.${params.partnerId},participant_2.eq.${userId})`)
          .maybeSingle();
        
        if (existing) {
          convId = existing.id;
        } else {
          const { data: newConv } = await supabase
            .from('conversations')
            .insert({
              participant_1: userId,
              participant_2: params.partnerId,
              is_group: false,
            })
            .select('id')
            .single();
          convId = newConv?.id;
        }
      }
      
      if (!convId) {
        toast.error('Could not create conversation');
        stream.getTracks().forEach(t => t.stop());
        return null;
      }
      
      // Create call record
      const { data: call, error } = await supabase
        .from('calls')
        .insert({
          caller_id: userId,
          receiver_id: params.partnerId,
          caller_name: 'Me',
          receiver_name: params.partnerName,
          receiver_avatar: params.partnerAvatar,
          receiver_phone: params.partnerPhone,
          conversation_id: convId,
          call_type: params.callType,
          status: 'ringing',
          webrtc_state: 'signaling',
        })
        .select('id')
        .single();
      
      if (error || !call) {
        toast.error('Could not initiate call');
        stream.getTracks().forEach(t => t.stop());
        return null;
      }
      
      // Set active call
      setActiveCall({
        id: call.id,
        partnerId: params.partnerId,
        partnerName: params.partnerName,
        partnerAvatar: params.partnerAvatar,
        partnerPhone: params.partnerPhone,
        callType: params.callType,
        isInitiator: true,
        status: 'ringing',
        preAcquiredStream: stream,
      });

      // 🔔 CRITICAL: Send FCM push notification to wake receiver's device
      try {
        // Get caller's own profile name for the notification
        const { data: callerProfile } = await supabase
          .from('profiles')
          .select('username, avatar_url, phone_number')
          .eq('id', userId)
          .single();

        console.log('📲 [CallContext] Sending FCM call notification to:', params.partnerId);
        const fcmStart = performance.now();
        const { data: fcmData, error: fcmError } = await supabase.functions.invoke('fcm-notify', {
          body: {
            type: 'call',
            receiverId: params.partnerId,
            callerId: userId,
            callerName: callerProfile?.username || 'Unknown',
            callerAvatar: callerProfile?.avatar_url || '',
            callerPhone: callerProfile?.phone_number || '',
            callId: call.id,
            callType: params.callType === 'video' ? 'video' : 'audio',
            conversationId: convId,
          }
        });
        const fcmLatency = Math.round(performance.now() - fcmStart);

        if (fcmError) {
          console.warn('⚠️ [FCM-VALIDATION] Delivery FAILED:', fcmError, `(${fcmLatency}ms)`);
        } else {
          const v = fcmData?.validation;
          if (v) {
            console.log(`✅ [FCM-VALIDATION] Status: ${v.status} | Tokens: ${v.tokensFound} found, ${v.tokensSent} sent, ${v.tokensFailed} failed | Latency: ${v.latencyMs}ms (round-trip: ${fcmLatency}ms)`);
            if (v.status === 'no_tokens') {
              console.warn('🚨 [FCM-VALIDATION] Receiver has NO registered device tokens — push will NOT arrive');
            } else if (v.status === 'all_failed') {
              console.warn('🚨 [FCM-VALIDATION] ALL token deliveries failed — push did NOT reach any device');
            } else if (v.tokensFailed > 0) {
              console.warn(`⚠️ [FCM-VALIDATION] ${v.tokensFailed}/${v.tokensFound} tokens failed`);
            }
          } else {
            console.log(`✅ [CallContext] FCM call notification sent (${fcmLatency}ms)`);
          }
        }
      } catch (fcmErr) {
        console.warn('⚠️ [CallContext] FCM notification error:', fcmErr);
      }
      
      return call.id;
    } catch (err: any) {
      console.error('[CallContext] initiateCall error:', err);
      
      if (err.name === 'NotAllowedError') {
        toast.error(params.callType === 'video' 
          ? 'Please allow camera and microphone'
          : 'Please allow microphone access'
        );
      } else if (err.name === 'NotReadableError') {
        toast.error('Microphone is busy. Close other apps.');
      } else if (err.name === 'NotFoundError') {
        toast.error('No microphone found');
      } else {
        toast.error('Could not start call');
      }
      return null;
    } finally {
      mediaAcquisitionInProgress = false;
    }
  }, [userId]);

  /**
   * ANSWER CALL
   */
  const answerCall = useCallback(async () => {
    const call = incomingCallRef.current;
    if (!call) return;
    
    try {
      // Pre-acquire media UNDER USER GESTURE
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: call.callType === 'video',
      });
      
      // Update DB
      await supabase
        .from('calls')
        .update({ status: 'active', started_at: new Date().toISOString() })
        .eq('id', call.id);
      
      // Move to active
      setActiveCall({
        ...call,
        status: 'connecting',
        preAcquiredStream: stream,
      });
      setIncomingCall(null);
    } catch (err: any) {
      console.error('[CallContext] answerCall error:', err);
      if (err.name === 'NotAllowedError') {
        toast.error('Please allow microphone access');
      } else if (err.name === 'NotReadableError') {
        toast.error('Microphone is busy. Close other apps and try again.');
      } else {
        toast.error('Could not answer call');
      }
    }
  }, []);

  /**
   * REJECT CALL
   */
  const rejectCall = useCallback(async () => {
    const call = incomingCallRef.current;
    if (!call) return;
    
    await supabase
      .from('calls')
      .update({ status: 'ended', ended_at: new Date().toISOString(), missed: false })
      .eq('id', call.id);
    
    setIncomingCall(null);
    // Silent - no toast for call declined
  }, []);

  /**
   * END CALL
   */
  const endCall = useCallback(async () => {
    const call = activeCallRef.current;
    if (!call) return;
    
    // Clean up pre-acquired stream if not yet used
    if (call.preAcquiredStream) {
      call.preAcquiredStream.getTracks().forEach(t => t.stop());
    }
    
    await supabase
      .from('calls')
      .update({ 
        status: 'ended', 
        ended_at: new Date().toISOString(),
        webrtc_state: 'ended',
      })
      .eq('id', call.id);
    
    setActiveCall(null);
  }, []);

  const value: CallContextType = {
    activeCall,
    incomingCall,
    initiateCall,
    answerCall,
    rejectCall,
    endCall,
    isInCall: !!activeCall,
    hasIncomingCall: !!incomingCall,
  };

  return (
    <CallContext.Provider value={value}>
      {children}
    </CallContext.Provider>
  );
}
