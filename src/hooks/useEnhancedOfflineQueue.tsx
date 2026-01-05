/**
 * Enhanced Offline Message Queue
 * Robust offline-first messaging with automatic retry and sync
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { toast } from 'sonner';

interface QueuedMessage {
  id: string;
  conversation_id: string;
  content: string;
  message_type: string;
  media_url?: string;
  created_at: string;
  retry_count: number;
  status: 'pending' | 'sending' | 'failed';
  error?: string;
}

interface OfflineQueueDB extends DBSchema {
  messages: {
    key: string;
    value: QueuedMessage;
    indexes: { 'by-conversation': string; 'by-status': string };
  };
  sync_state: {
    key: string;
    value: { last_sync: string; pending_count: number };
  };
}

export const useEnhancedOfflineQueue = (conversationId: string | null) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([]);
  const dbRef = useRef<IDBPDatabase<OfflineQueueDB> | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Initialize IndexedDB
   */
  const initDB = useCallback(async () => {
    try {
      const db = await openDB<OfflineQueueDB>('chatr-offline-queue', 1, {
        upgrade(db) {
          // Messages store
          const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
          msgStore.createIndex('by-conversation', 'conversation_id');
          msgStore.createIndex('by-status', 'status');

          // Sync state store
          db.createObjectStore('sync_state', { keyPath: 'key' });
        },
      });
      dbRef.current = db;
      return db;
    } catch (error) {
      console.error('Failed to initialize offline DB:', error);
      return null;
    }
  }, []);

  /**
   * Add message to offline queue
   */
  const queueMessage = useCallback(async (
    content: string,
    messageType: string = 'text',
    mediaUrl?: string
  ): Promise<QueuedMessage | null> => {
    if (!conversationId) return null;

    const db = dbRef.current || await initDB();
    if (!db) return null;

    const queuedMessage: QueuedMessage = {
      id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      conversation_id: conversationId,
      content,
      message_type: messageType,
      media_url: mediaUrl,
      created_at: new Date().toISOString(),
      retry_count: 0,
      status: 'pending'
    };

    try {
      await db.add('messages', queuedMessage);
      await updatePendingCount();
      setQueuedMessages(prev => [...prev, queuedMessage]);
      
      // Try to send immediately if online
      if (isOnline) {
        sendMessage(queuedMessage);
      }

      return queuedMessage;
    } catch (error) {
      console.error('Failed to queue message:', error);
      return null;
    }
  }, [conversationId, isOnline, initDB]);

  /**
   * Send a single queued message
   */
  const sendMessage = useCallback(async (message: QueuedMessage): Promise<boolean> => {
    const db = dbRef.current;
    if (!db) return false;

    try {
      // Update status to sending
      await db.put('messages', { ...message, status: 'sending' });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Send to server
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: message.conversation_id,
          sender_id: user.id,
          content: message.content,
          message_type: message.message_type,
          media_url: message.media_url
        })
        .select()
        .single();

      if (error) throw error;

      // Remove from queue on success
      await db.delete('messages', message.id);
      await updatePendingCount();
      
      setQueuedMessages(prev => prev.filter(m => m.id !== message.id));
      
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Update retry count
      const updatedMessage: QueuedMessage = {
        ...message,
        status: 'failed',
        retry_count: message.retry_count + 1,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      await db.put('messages', updatedMessage);
      setQueuedMessages(prev => 
        prev.map(m => m.id === message.id ? updatedMessage : m)
      );

      return false;
    }
  }, []);

  /**
   * Sync all pending messages
   */
  const syncPendingMessages = useCallback(async () => {
    const db = dbRef.current || await initDB();
    if (!db || !isOnline || isSyncing) return;

    setIsSyncing(true);

    try {
      const pendingMessages = await db.getAllFromIndex('messages', 'by-status', 'pending');
      const failedMessages = await db.getAllFromIndex('messages', 'by-status', 'failed');
      
      // Only retry failed messages with < 5 retries
      const toRetry = failedMessages.filter(m => m.retry_count < 5);
      const allToSend = [...pendingMessages, ...toRetry];

      let successCount = 0;
      let failCount = 0;

      for (const message of allToSend) {
        const success = await sendMessage(message);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
        // Small delay between messages
        await new Promise(r => setTimeout(r, 100));
      }

      if (successCount > 0) {
        toast.success(`Synced ${successCount} message${successCount > 1 ? 's' : ''}`);
      }

      // Update sync state in localStorage (simpler than complex IndexedDB schema)
      localStorage.setItem('chatr_last_sync', JSON.stringify({
        last_sync: new Date().toISOString(),
        pending_count: failCount
      }));

    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, sendMessage, initDB]);

  /**
   * Update pending count
   */
  const updatePendingCount = useCallback(async () => {
    const db = dbRef.current;
    if (!db) return;

    const pending = await db.getAllFromIndex('messages', 'by-status', 'pending');
    const failed = await db.getAllFromIndex('messages', 'by-status', 'failed');
    setPendingCount(pending.length + failed.filter(m => m.retry_count < 5).length);
  }, []);

  /**
   * Load queued messages for current conversation
   */
  const loadQueuedMessages = useCallback(async () => {
    if (!conversationId) return;

    const db = dbRef.current || await initDB();
    if (!db) return;

    const messages = await db.getAllFromIndex('messages', 'by-conversation', conversationId);
    setQueuedMessages(messages);
  }, [conversationId, initDB]);

  /**
   * Clear failed messages
   */
  const clearFailed = useCallback(async () => {
    const db = dbRef.current;
    if (!db) return;

    const failedMessages = await db.getAllFromIndex('messages', 'by-status', 'failed');
    for (const msg of failedMessages) {
      await db.delete('messages', msg.id);
    }
    await updatePendingCount();
    loadQueuedMessages();
    toast.success('Cleared failed messages');
  }, [updatePendingCount, loadQueuedMessages]);

  /**
   * Retry a specific failed message
   */
  const retryMessage = useCallback(async (messageId: string) => {
    const db = dbRef.current;
    if (!db) return;

    const message = await db.get('messages', messageId);
    if (message && message.status === 'failed') {
      const success = await sendMessage({ ...message, status: 'pending', retry_count: 0 });
      if (success) {
        toast.success('Message sent');
      }
    }
  }, [sendMessage]);

  /**
   * Online/offline detection
   */
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online - syncing messages...');
      syncPendingMessages();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('You are offline - messages will be queued');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPendingMessages]);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    initDB().then(() => {
      updatePendingCount();
      loadQueuedMessages();
    });
  }, [initDB, updatePendingCount, loadQueuedMessages]);

  /**
   * Periodic sync when online
   */
  useEffect(() => {
    if (isOnline) {
      syncIntervalRef.current = setInterval(() => {
        syncPendingMessages();
      }, 30000); // Every 30 seconds
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [isOnline, syncPendingMessages]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    queuedMessages,
    queueMessage,
    syncPendingMessages,
    clearFailed,
    retryMessage
  };
};
