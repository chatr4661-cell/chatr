import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type CallType = 'audio' | 'video';

export interface OneTouchCallOptions {
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string;
  callType: CallType;
}

export interface CallState {
  callId: string | null;
  status: 'idle' | 'initiating' | 'ringing' | 'connecting' | 'connected' | 'ended' | 'failed';
  callType: CallType | null;
  recipientId: string | null;
  recipientName: string | null;
  startTime: number | null;
  endTime: number | null;
}

/**
 * One-touch calling - instant call initiation with single tap
 * FaceTime-quality UX with immediate feedback
 */
export const useOneTouchCall = () => {
  const [callState, setCallState] = useState<CallState>({
    callId: null,
    status: 'idle',
    callType: null,
    recipientId: null,
    recipientName: null,
    startTime: null,
    endTime: null,
  });

  const initiateCall = useCallback(async (options: OneTouchCallOptions) => {
    const { recipientId, recipientName, recipientAvatar, callType } = options;

    try {
      // Immediate UI feedback
      setCallState({
        callId: null,
        status: 'initiating',
        callType,
        recipientId,
        recipientName,
        startTime: Date.now(),
        endTime: null,
      });

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Get caller profile
      const { data: callerProfile } = await supabase
        .from('profiles')
        .select('username, avatar_url, phone_number')
        .eq('id', user.id)
        .single();

      // Create call record - using conversation_id as required field
      const { data: callData, error: callError } = await supabase
        .from('calls')
        .insert({
          conversation_id: recipientId, // Required field
          call_type: callType,
          status: 'ringing',
          caller_name: callerProfile?.username,
          caller_avatar: callerProfile?.avatar_url,
          webrtc_state: 'new',
        })
        .select()
        .single();

      if (callError) throw callError;

      setCallState(prev => ({
        ...prev,
        callId: callData.id,
        status: 'ringing',
      }));

      // Send push notification for call
      await supabase.functions.invoke('send-call-notification', {
        body: {
          callId: callData.id,
          callerId: user.id,
          callerName: callerProfile?.username || 'Unknown',
          callerAvatar: callerProfile?.avatar_url,
          receiverId: recipientId,
          callType,
        },
      });

      // Send WebRTC offer signal
      await supabase.from('webrtc_signals').insert({
        from_user: user.id,
        to_user: recipientId,
        signal_type: 'offer_pending',
        signal_data: { callType, timestamp: Date.now(), callId: callData.id },
      });

      return callData.id;
    } catch (error: any) {
      console.error('Call initiation failed:', error);
      setCallState(prev => ({
        ...prev,
        status: 'failed',
        endTime: Date.now(),
      }));
      toast.error('Failed to start call');
      return null;
    }
  }, []);

  const endCall = useCallback(async (reason?: string) => {
    if (!callState.callId) return;

    try {
      // Update call record
      await supabase
        .from('calls')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          end_reason: reason || 'user_ended',
        })
        .eq('id', callState.callId);

      // Send hangup signal
      const { data: { user } } = await supabase.auth.getUser();
      if (user && callState.recipientId) {
        await supabase.from('webrtc_signals').insert({
          from_user: user.id,
          to_user: callState.recipientId,
          signal_type: 'hangup',
          signal_data: { reason: reason || 'user_ended', callId: callState.callId },
        });
      }

      setCallState(prev => ({
        ...prev,
        status: 'ended',
        endTime: Date.now(),
      }));
    } catch (error) {
      console.error('Error ending call:', error);
    }
  }, [callState.callId, callState.recipientId]);

  const answerCall = useCallback(async (callId: string) => {
    try {
      setCallState(prev => ({
        ...prev,
        callId,
        status: 'connecting',
      }));

      await supabase
        .from('calls')
        .update({
          status: 'active',
          answered_at: new Date().toISOString(),
          webrtc_state: 'connecting',
        })
        .eq('id', callId);

      setCallState(prev => ({
        ...prev,
        status: 'connected',
      }));

      return true;
    } catch (error) {
      console.error('Error answering call:', error);
      return false;
    }
  }, []);

  const rejectCall = useCallback(async (callId: string) => {
    try {
      await supabase
        .from('calls')
        .update({
          status: 'rejected',
          ended_at: new Date().toISOString(),
        })
        .eq('id', callId);

      setCallState({
        callId: null,
        status: 'idle',
        callType: null,
        recipientId: null,
        recipientName: null,
        startTime: null,
        endTime: null,
      });

      return true;
    } catch (error) {
      console.error('Error rejecting call:', error);
      return false;
    }
  }, []);

  const resetCallState = useCallback(() => {
    setCallState({
      callId: null,
      status: 'idle',
      callType: null,
      recipientId: null,
      recipientName: null,
      startTime: null,
      endTime: null,
    });
  }, []);

  return {
    callState,
    initiateCall,
    endCall,
    answerCall,
    rejectCall,
    resetCallState,
  };
};
