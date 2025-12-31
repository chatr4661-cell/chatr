import { useState, useEffect, useCallback, useRef } from 'react';
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
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes for better UX
const LS_KEY = 'chatr-conv-cache';

export const useConversationCache = () => {
  const [db, setDb] = useState<IDBPDatabase<ChatDB> | null>(null);
  const dbInitPromise = useRef<Promise<IDBPDatabase<ChatDB>> | null>(null);

  useEffect(() => {
    const initDB = async () => {
      try {
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
        return database;
      } catch (error) {
        console.error('IndexedDB init error:', error);
        return null;
      }
    };

    dbInitPromise.current = initDB() as Promise<IDBPDatabase<ChatDB>>;
  }, []);

  // FAST: Get from localStorage first, then IndexedDB
  const getCachedConversations = useCallback(async (): Promise<any[] | null> => {
    // CRITICAL: Try localStorage first (instant)
    try {
      const lsCache = localStorage.getItem(LS_KEY);
      if (lsCache) {
        const parsed = JSON.parse(lsCache);
        const age = Date.now() - (parsed.timestamp || 0);
        if (age < CACHE_TTL && parsed.data?.length > 0) {
          return parsed.data;
        }
      }
    } catch (e) {
      // Ignore localStorage errors
    }

    // Fallback to IndexedDB
    const database = db || (dbInitPromise.current ? await dbInitPromise.current : null);
    if (!database) return null;

    try {
      const cached = await database.get('conversations', 'list');
      if (!cached) return null;

      const age = Date.now() - cached.timestamp;
      if (age > CACHE_TTL) {
        await database.delete('conversations', 'list');
        return null;
      }

      return cached.data;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }, [db]);

  const setCachedConversations = useCallback(async (conversations: any[]) => {
    // CRITICAL: Write to localStorage first (instant for next load)
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        data: conversations.slice(0, 30), // Only cache first 30 for speed
        timestamp: Date.now()
      }));
    } catch (e) {
      // Ignore localStorage errors
    }

    // Then write to IndexedDB for full cache
    const database = db || (dbInitPromise.current ? await dbInitPromise.current : null);
    if (!database) return;

    try {
      await database.put('conversations', {
        id: 'list',
        data: conversations,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }, [db]);

  const getCachedMessages = useCallback(async (conversationId: string): Promise<any[] | null> => {
    const database = db || (dbInitPromise.current ? await dbInitPromise.current : null);
    if (!database) return null;

    try {
      const cached = await database.get('messages', conversationId);
      if (!cached) return null;

      const age = Date.now() - cached.timestamp;
      if (age > CACHE_TTL) {
        await database.delete('messages', conversationId);
        return null;
      }

      return cached.messages;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }, [db]);

  const setCachedMessages = useCallback(async (conversationId: string, messages: any[]) => {
    const database = db || (dbInitPromise.current ? await dbInitPromise.current : null);
    if (!database) return;

    try {
      await database.put('messages', {
        conversationId,
        messages,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }, [db]);

  const clearCache = useCallback(async () => {
    // Clear localStorage
    try {
      localStorage.removeItem(LS_KEY);
    } catch (e) {}

    const database = db || (dbInitPromise.current ? await dbInitPromise.current : null);
    if (!database) return;

    try {
      await database.clear('conversations');
      await database.clear('messages');
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
