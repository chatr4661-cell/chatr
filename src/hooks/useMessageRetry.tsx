import React, { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { OfflineMessageQueue } from '@/utils/pwaUtils';

interface MessageData {
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  media_url?: string;
  file_name?: string;
  duration?: number;
}

interface FailedMessage extends MessageData {
  tempId: string;
  attempts: number;
  lastError?: string;
}

export const useMessageRetry = () => {
  const { toast } = useToast();
  const [failedMessages, setFailedMessages] = useState<Map<string, FailedMessage>>(new Map());
  const offlineQueue = new OfflineMessageQueue();

  const sendMessageWithRetry = useCallback(async (
    messageData: MessageData,
    maxRetries = 3
  ): Promise<{ success: boolean; messageId?: string; error?: string }> => {
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    let attempts = 0;
    let lastError = '';

    while (attempts < maxRetries) {
      try {
        // Check if online
        if (!navigator.onLine) {
          console.log('📴 Offline - queuing message');
          await offlineQueue.addMessage({ ...messageData, tempId });
          toast({
            title: 'Message queued',
            description: 'Will be sent when you\'re back online',
          });
          return { success: false, error: 'offline' };
        }

        const { data, error } = await supabase
          .from('messages')
          .insert([messageData])
          .select()
          .single();

        if (error) throw error;

        // Success - remove from failed messages
        setFailedMessages(prev => {
          const newMap = new Map(prev);
          newMap.delete(tempId);
          return newMap;
        });

        return { success: true, messageId: data.id };
      } catch (error: any) {
        attempts++;
        lastError = error.message || 'Failed to send message';
        console.error(`❌ Send attempt ${attempts} failed:`, error);

        if (attempts < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempts - 1) * 1000;
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    const failedMsg: FailedMessage = {
      ...messageData,
      tempId,
      attempts,
      lastError
    };

    setFailedMessages(prev => new Map(prev).set(tempId, failedMsg));

    toast({
      title: 'Failed to send message',
      description: lastError || 'Tap retry button below',
      variant: 'destructive',
    });

    return { success: false, error: lastError };
  }, [toast]);

  const retryMessage = useCallback(async (tempId: string) => {
    const message = failedMessages.get(tempId);
    if (!message) return;

    toast({
      title: 'Retrying...',
      description: 'Attempting to send message',
    });

    const result = await sendMessageWithRetry({
      conversation_id: message.conversation_id,
      sender_id: message.sender_id,
      content: message.content,
      message_type: message.message_type,
      media_url: message.media_url,
      file_name: message.file_name,
      duration: message.duration
    });

    if (result.success) {
      toast({
        title: 'Message sent',
        description: 'Your message was delivered',
      });
    }
  }, [failedMessages, sendMessageWithRetry, toast]);

  const syncOfflineMessages = useCallback(async () => {
    if (!navigator.onLine) {
      console.log('Still offline, cannot sync');
      return;
    }

    const queuedMessages = await offlineQueue.getMessages();
    console.log(`📤 Syncing ${queuedMessages.length} offline messages`);

    for (const msg of queuedMessages) {
      const { tempId, ...messageData } = msg;
      const result = await sendMessageWithRetry(messageData, 1);
      
      if (result.success) {
        await offlineQueue.removeMessage(msg.id);
      }
    }

    if (queuedMessages.length > 0) {
      toast({
        title: 'Messages synced',
        description: `Sent ${queuedMessages.length} offline messages`,
      });
    }
  }, [sendMessageWithRetry, toast]);

  return {
    sendMessageWithRetry,
    retryMessage,
    syncOfflineMessages,
    failedMessages: Array.from(failedMessages.values())
  };
};
