/**
 * Call Transfer Hook - Features #4-5
 * Supports Blind and Attended (Warm) transfers
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

interface TransferTarget {
  userId: string;
  name: string;
  phone?: string;
}

interface TransferState {
  isTransferring: boolean;
  transferType: 'blind' | 'attended' | null;
  consultCall: boolean;
  originalCallId: string | null;
  targetUser: TransferTarget | null;
}

export const useCallTransfer = () => {
  const [state, setState] = useState<TransferState>({
    isTransferring: false,
    transferType: null,
    consultCall: false,
    originalCallId: null,
    targetUser: null,
  });

  // Blind Transfer - Immediate transfer without speaking to recipient
  const blindTransfer = useCallback(async (
    callId: string,
    targetUserId: string,
    targetName: string
  ): Promise<boolean> => {
    setState(s => ({ ...s, isTransferring: true, transferType: 'blind' }));
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get original call details
      const { data: call } = await supabase
        .from('calls')
        .select('*')
        .eq('id', callId)
        .single();

      if (!call) throw new Error('Call not found');

      // Determine who to transfer (the other party)
      const transferFromId = call.caller_id === user.id ? call.receiver_id : call.caller_id;

      // Create new call record for transfer
      const { data: newCall, error: createError } = await supabase
        .from('calls')
        .insert({
          caller_id: transferFromId || '',
          receiver_id: targetUserId,
          call_type: call.call_type,
          status: 'ringing',
          conversation_id: call.conversation_id,
          caller_name: call.caller_id === user.id ? call.receiver_name : call.caller_name,
          receiver_name: targetName,
        })
        .select()
        .single();

      if (createError) throw createError;

      // End original call with transfer note
      await supabase
        .from('calls')
        .update({
          status: 'transferred',
          ended_at: new Date().toISOString(),
          quality_metrics: { transferred_to: targetUserId, transfer_type: 'blind' } as Json
        })
        .eq('id', callId);

      // Send signal to new recipient via messages or direct notification
      // (webrtc_signals table uses different column structure)
      toast.success(`Call transferred to ${targetName}`);
      return true;
    } catch (error) {
      console.error('Blind transfer failed:', error);
      toast.error('Transfer failed');
      return false;
    } finally {
      setState(s => ({ ...s, isTransferring: false, transferType: null }));
    }
  }, []);

  // Attended Transfer - Consult with recipient before completing
  const startAttendedTransfer = useCallback(async (
    callId: string,
    targetUserId: string,
    targetName: string
  ): Promise<boolean> => {
    setState({
      isTransferring: true,
      transferType: 'attended',
      consultCall: true,
      originalCallId: callId,
      targetUser: { userId: targetUserId, name: targetName },
    });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Put original call on hold
      await supabase
        .from('calls')
        .update({ webrtc_state: 'held' })
        .eq('id', callId);

      // Start consultation call to target
      const { error } = await supabase
        .from('calls')
        .insert({
          caller_id: user.id,
          receiver_id: targetUserId,
          call_type: 'voice',
          status: 'ringing',
          conversation_id: callId, // Link to original
          quality_metrics: { is_consult_call: true, original_call_id: callId } as Json
        })
        .select()
        .single();

      if (error) throw error;

      toast.info(`Calling ${targetName} for transfer consultation...`);
      return true;
    } catch (error) {
      console.error('Attended transfer start failed:', error);
      toast.error('Could not start consultation call');
      setState(s => ({ ...s, isTransferring: false, consultCall: false }));
      return false;
    }
  }, []);

  // Complete attended transfer after consultation
  const completeAttendedTransfer = useCallback(async (): Promise<boolean> => {
    if (!state.originalCallId || !state.targetUser) {
      toast.error('No transfer in progress');
      return false;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: originalCall } = await supabase
        .from('calls')
        .select('*')
        .eq('id', state.originalCallId)
        .single();

      if (!originalCall) throw new Error('Original call not found');

      const transferFromId = originalCall.caller_id === user.id 
        ? originalCall.receiver_id 
        : originalCall.caller_id;

      // Create transferred call
      const { error } = await supabase
        .from('calls')
        .insert({
          caller_id: transferFromId || '',
          receiver_id: state.targetUser.userId,
          call_type: originalCall.call_type,
          status: 'active',
          conversation_id: originalCall.conversation_id,
        })
        .select()
        .single();

      if (error) throw error;

      // End original call
      await supabase
        .from('calls')
        .update({
          status: 'transferred',
          ended_at: new Date().toISOString(),
          quality_metrics: { 
            transferred_to: state.targetUser.userId, 
            transfer_type: 'attended' 
          } as Json
        })
        .eq('id', state.originalCallId);

      toast.success(`Call transferred to ${state.targetUser.name}`);
      return true;
    } catch (error) {
      console.error('Complete attended transfer failed:', error);
      toast.error('Transfer completion failed');
      return false;
    } finally {
      setState({
        isTransferring: false,
        transferType: null,
        consultCall: false,
        originalCallId: null,
        targetUser: null,
      });
    }
  }, [state]);

  // Cancel attended transfer and resume original call
  const cancelAttendedTransfer = useCallback(async (): Promise<boolean> => {
    if (!state.originalCallId) return false;

    try {
      // Resume original call
      await supabase
        .from('calls')
        .update({ webrtc_state: 'connected' })
        .eq('id', state.originalCallId);

      toast.info('Transfer cancelled, resuming call');
      return true;
    } catch (error) {
      console.error('Cancel transfer failed:', error);
      return false;
    } finally {
      setState({
        isTransferring: false,
        transferType: null,
        consultCall: false,
        originalCallId: null,
        targetUser: null,
      });
    }
  }, [state.originalCallId]);

  return {
    ...state,
    blindTransfer,
    startAttendedTransfer,
    completeAttendedTransfer,
    cancelAttendedTransfer,
  };
};
