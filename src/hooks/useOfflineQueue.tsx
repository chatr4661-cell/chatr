import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface QueuedMessage {
  id: string;
  content: string;
  conversationId: string;
  senderId: string;
  timestamp: number;
  retries: number;
}

const MAX_RETRIES = 5;
const RETRY_DELAYS = [1000, 2000, 5000, 10000, 30000]; // Progressive backoff

export const useOfflineQueue = () => {
  const [queue, setQueue] = useState<QueuedMessage[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const processingRef = useRef(false);

  // Load queue from localStorage on mount
  useEffect(() => {
    const savedQueue = localStorage.getItem('message-queue');
    if (savedQueue) {
      try {
        setQueue(JSON.parse(savedQueue));
      } catch (e) {
        console.error('Failed to load queue:', e);
      }
    }
  }, []);

  // Save queue to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('message-queue', JSON.stringify(queue));
  }, [queue]);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processQueue();
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Process queue when online
  const processQueue = useCallback(async () => {
    if (processingRef.current || !isOnline || queue.length === 0) return;

    processingRef.current = true;

    const currentQueue = [...queue];
    
    for (const msg of currentQueue) {
      try {
        const { error } = await supabase
          .from('messages')
          .insert({
            content: msg.content,
            sender_id: msg.senderId,
            conversation_id: msg.conversationId,
          });

        if (error) throw error;

        // Remove from queue on success
        setQueue(prev => prev.filter(m => m.id !== msg.id));
        
      } catch (error) {
        console.error('Failed to send queued message:', error);
        
        // Retry logic with exponential backoff
        if (msg.retries < MAX_RETRIES) {
          const delay = RETRY_DELAYS[msg.retries] || 30000;
          
          setTimeout(() => {
            setQueue(prev => prev.map(m => 
              m.id === msg.id ? { ...m, retries: m.retries + 1 } : m
            ));
          }, delay);
        } else {
          // Max retries reached, remove from queue
          setQueue(prev => prev.filter(m => m.id !== msg.id));
          toast.error('Message failed to send after multiple attempts');
        }
      }
    }

    processingRef.current = false;
  }, [isOnline, queue]);

  // Add message to queue
  const queueMessage = useCallback((
    content: string,
    conversationId: string,
    senderId: string
  ) => {
    const queuedMsg: QueuedMessage = {
      id: `offline_${Date.now()}_${Math.random()}`,
      content,
      conversationId,
      senderId,
      timestamp: Date.now(),
      retries: 0,
    };

    setQueue(prev => [...prev, queuedMsg]);

    // Try to process immediately if online
    if (isOnline) {
      setTimeout(processQueue, 100);
    }

    return queuedMsg.id;
  }, [isOnline, processQueue]);

  return {
    queueMessage,
    queueSize: queue.length,
    isOnline,
  };
};
