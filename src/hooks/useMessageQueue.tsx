import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface QueuedMessage {
  id: string;
  conversation_id: string;
  content: string;
  media_url?: string;
  message_type: string;
  created_at: string;
  retry_count: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

export const useMessageQueue = (userId: string | null) => {
  const [queue, setQueue] = useState<QueuedMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load queued messages from localStorage
  useEffect(() => {
    if (!userId) return;

    const stored = localStorage.getItem(`message_queue_${userId}`);
    if (stored) {
      try {
        setQueue(JSON.parse(stored));
      } catch (error) {
        console.error('Failed to load message queue:', error);
        localStorage.removeItem(`message_queue_${userId}`);
      }
    }
  }, [userId]);

  // Save queue to localStorage
  useEffect(() => {
    if (!userId) return;
    localStorage.setItem(`message_queue_${userId}`, JSON.stringify(queue));
  }, [queue, userId]);

  // Process queue when online
  useEffect(() => {
    if (isOnline && queue.length > 0 && !isProcessing) {
      processQueue();
    }
  }, [isOnline, queue.length]);

  const addToQueue = useCallback((message: Omit<QueuedMessage, 'id' | 'created_at' | 'retry_count'>) => {
    const queuedMessage: QueuedMessage = {
      ...message,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      retry_count: 0,
    };

    setQueue(prev => [...prev, queuedMessage]);
    
    // Show offline notification
    if (!isOnline) {
      toast.info('Message queued - will send when back online');
    }

    return queuedMessage.id;
  }, [isOnline]);

  const processQueue = async () => {
    if (!userId || queue.length === 0) return;

    setIsProcessing(true);

    const currentQueue = [...queue];
    const failedMessages: QueuedMessage[] = [];

    for (const message of currentQueue) {
      try {
        // Attempt to send message
        const { error } = await supabase
          .from('messages')
          .insert({
            conversation_id: message.conversation_id,
            sender_id: userId,
            content: message.content,
            media_url: message.media_url,
            message_type: message.message_type,
            status: 'sent',
          });

        if (error) {
          throw error;
        }

        // Success - remove from queue
        setQueue(prev => prev.filter(m => m.id !== message.id));
        
        toast.success('Queued message sent');
      } catch (error) {
        console.error('Failed to send queued message:', error);

        // Increment retry count
        const updatedMessage = {
          ...message,
          retry_count: message.retry_count + 1,
        };

        if (updatedMessage.retry_count >= MAX_RETRIES) {
          // Max retries reached - notify user
          toast.error('Failed to send message after multiple attempts', {
            action: {
              label: 'Retry',
              onClick: () => {
                setQueue(prev => [...prev, { ...updatedMessage, retry_count: 0 }]);
              },
            },
          });
          
          setQueue(prev => prev.filter(m => m.id !== message.id));
        } else {
          failedMessages.push(updatedMessage);
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
      }
    }

    // Update queue with failed messages
    if (failedMessages.length > 0) {
      setQueue(prev => {
        const remaining = prev.filter(m => 
          !currentQueue.find(cm => cm.id === m.id)
        );
        return [...remaining, ...failedMessages];
      });
    }

    setIsProcessing(false);
  };

  const clearQueue = useCallback(() => {
    if (!userId) return;
    setQueue([]);
    localStorage.removeItem(`message_queue_${userId}`);
    toast.success('Message queue cleared');
  }, [userId]);

  const retryMessage = useCallback((messageId: string) => {
    setQueue(prev => 
      prev.map(m => m.id === messageId ? { ...m, retry_count: 0 } : m)
    );
  }, []);

  return {
    queue,
    isProcessing,
    isOnline,
    addToQueue,
    processQueue,
    clearQueue,
    retryMessage,
    queueLength: queue.length,
  };
};
