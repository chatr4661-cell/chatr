import { useState, useEffect, useCallback } from 'react';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface ConversationCache {
  id: string;
  data: any;
  timestamp: number;
}

interface ChatDB extends DBSchema {
  conversations: {
    key: string;
    value: ConversationCache;
  };
  messages: {
    key: string;
    value: {
      conversationId: string;
      messages: any[];
      timestamp: number;
    };
    indexes: { 'by-conversation': string };
  };
}

const DB_NAME = 'chatr-cache';
const DB_VERSION = 1;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const useConversationCache = () => {
  const [db, setDb] = useState<IDBPDatabase<ChatDB> | null>(null);

  useEffect(() => {
    const initDB = async () => {
      const database = await openDB<ChatDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('conversations')) {
            db.createObjectStore('conversations', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('messages')) {
            const messageStore = db.createObjectStore('messages', { keyPath: 'conversationId' });
            messageStore.createIndex('by-conversation', 'conversationId');
          }
        },
      });
      setDb(database);
    };

    initDB();
  }, []);

  const getCachedConversations = useCallback(async (): Promise<any[] | null> => {
    if (!db) return null;

    try {
      const cached = await db.get('conversations', 'list');
      if (!cached) return null;

      const age = Date.now() - cached.timestamp;
      if (age > CACHE_TTL) {
        await db.delete('conversations', 'list');
        return null;
      }

      return cached.data;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }, [db]);

  const setCachedConversations = useCallback(async (conversations: any[]) => {
    if (!db) return;

    try {
      await db.put('conversations', {
        id: 'list',
        data: conversations,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }, [db]);

  const getCachedMessages = useCallback(async (conversationId: string): Promise<any[] | null> => {
    if (!db) return null;

    try {
      const cached = await db.get('messages', conversationId);
      if (!cached) return null;

      const age = Date.now() - cached.timestamp;
      if (age > CACHE_TTL) {
        await db.delete('messages', conversationId);
        return null;
      }

      return cached.messages;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }, [db]);

  const setCachedMessages = useCallback(async (conversationId: string, messages: any[]) => {
    if (!db) return;

    try {
      await db.put('messages', {
        conversationId,
        messages,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }, [db]);

  const clearCache = useCallback(async () => {
    if (!db) return;

    try {
      await db.clear('conversations');
      await db.clear('messages');
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }, [db]);

  return {
    getCachedConversations,
    setCachedConversations,
    getCachedMessages,
    setCachedMessages,
    clearCache,
  };
};
