/**
 * SMS/RCS Fallback Hook
 * Handles messaging to non-CHATR users
 */

import { useState, useCallback } from 'react';
import { SMSGatewayService, SMSMessage, RecipientCapability } from '@/services/messaging/SMSGatewayService';
import { useToast } from '@/hooks/use-toast';

interface SMSFallbackState {
  isSending: boolean;
  lastMessage: SMSMessage | null;
  recipientCapability: RecipientCapability | null;
  error: string | null;
}

export function useSMSFallback() {
  const { toast } = useToast();
  const [state, setState] = useState<SMSFallbackState>({
    isSending: false,
    lastMessage: null,
    recipientCapability: null,
    error: null,
  });

  /**
   * Check recipient capability
   */
  const checkCapability = useCallback(async (
    phoneNumber: string
  ): Promise<RecipientCapability> => {
    const capability = await SMSGatewayService.getRecipientCapability(phoneNumber);
    setState(prev => ({ ...prev, recipientCapability: capability }));
    return capability;
  }, []);

  /**
   * Send message with auto channel selection
   */
  const sendMessage = useCallback(async (
    to: string,
    body: string,
    mediaUrl?: string
  ): Promise<SMSMessage | null> => {
    setState(prev => ({ ...prev, isSending: true, error: null }));

    try {
      const message = await SMSGatewayService.sendMessage(to, body, undefined, mediaUrl);
      
      setState(prev => ({
        ...prev,
        isSending: false,
        lastMessage: message,
      }));

      if (message.status === 'sent') {
        const channelLabel = message.type === 'rcs' ? 'RCS' : 'SMS';
        toast({
          title: `Message Sent via ${channelLabel}`,
          description: `To: ${to}`,
        });
      } else if (message.status === 'failed') {
        throw new Error(message.error || 'Message failed');
      }

      return message;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Message failed';
      setState(prev => ({
        ...prev,
        isSending: false,
        error: errorMessage,
      }));

      toast({
        title: 'Message Failed',
        description: errorMessage,
        variant: 'destructive',
      });

      return null;
    }
  }, [toast]);

  /**
   * Send CHATR invite
   */
  const sendInvite = useCallback(async (
    to: string,
    inviterName: string
  ): Promise<SMSMessage | null> => {
    setState(prev => ({ ...prev, isSending: true, error: null }));

    try {
      const message = await SMSGatewayService.sendChatrInvite(to, inviterName);
      
      setState(prev => ({
        ...prev,
        isSending: false,
        lastMessage: message,
      }));

      toast({
        title: 'Invite Sent!',
        description: `${to} will receive an invite to join CHATR`,
      });

      return message;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invite failed';
      setState(prev => ({
        ...prev,
        isSending: false,
        error: errorMessage,
      }));

      toast({
        title: 'Invite Failed',
        description: errorMessage,
        variant: 'destructive',
      });

      return null;
    }
  }, [toast]);

  /**
   * Check if recipient is on CHATR
   */
  const isChatrUser = useCallback(async (phoneNumber: string): Promise<boolean> => {
    const capability = await checkCapability(phoneNumber);
    return capability.isChatrUser;
  }, [checkCapability]);

  /**
   * Get preferred channel for recipient
   */
  const getPreferredChannel = useCallback(async (
    phoneNumber: string
  ): Promise<'chatr' | 'rcs' | 'sms'> => {
    const capability = await checkCapability(phoneNumber);
    return capability.preferredChannel;
  }, [checkCapability]);

  return {
    ...state,
    checkCapability,
    sendMessage,
    sendInvite,
    isChatrUser,
    getPreferredChannel,
  };
}
