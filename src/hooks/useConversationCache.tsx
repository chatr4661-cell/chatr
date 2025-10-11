import { useState, useEffect, useCallback } from 'react';
import { openDB, IDBPDatabase } from 'idb';

interface CachedConversation {
  id: string;
  data: any;
  timestamp: number;
}

const DB_NAME = 'chatr-cache';
const STORE_NAME = 'conversations';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useConversationCache = () => {
  const [db, setDb] = useState<IDBPDatabase | null>(null);

  useEffect(() => {
    const initDB = async () => {
      try {
        const database = await openDB(DB_NAME, 1, {
          upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
              db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
          },
        });
        setDb(database);
      } catch (error) {
        console.error('Failed to init IndexedDB:', error);
      }
    };
    initDB();
  }, []);

  const getCached = useCallback(async (key: string): Promise<any | null> => {
    if (!db) return null;
    
    try {
      const cached = await db.get(STORE_NAME, key) as CachedConversation;
      if (!cached) return null;
      
      // Check if cache is still valid
      if (Date.now() - cached.timestamp > CACHE_DURATION) {
        await db.delete(STORE_NAME, key);
        return null;
      }
      
      return cached.data;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }, [db]);

  const setCache = useCallback(async (key: string, data: any) => {
    if (!db) return;
    
    try {
      await db.put(STORE_NAME, {
        id: key,
        data,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }, [db]);

  const clearCache = useCallback(async () => {
    if (!db) return;
    
    try {
      await db.clear(STORE_NAME);
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }, [db]);

  return { getCached, setCache, clearCache };
};
