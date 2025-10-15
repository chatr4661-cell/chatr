import { useState, useEffect, useCallback } from 'react';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface CacheDB extends DBSchema {
  cache: {
    key: string;
    value: {
      data: any;
      timestamp: number;
      ttl: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<CacheDB>> | null = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<CacheDB>('chatr-cache', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache');
        }
      },
    });
  }
  return dbPromise;
};

export function useAggressiveCache<T = any>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttl?: number; // milliseconds
    staleWhileRevalidate?: boolean;
    prefetch?: boolean;
  } = {}
) {
  const { ttl = 5 * 60 * 1000, staleWhileRevalidate = true, prefetch = false } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const getCached = useCallback(async () => {
    try {
      const db = await getDB();
      const cached = await db.get('cache', key);
      
      if (cached) {
        const age = Date.now() - cached.timestamp;
        if (age < cached.ttl) {
          return cached.data;
        }
        if (staleWhileRevalidate && age < cached.ttl * 2) {
          // Return stale data but trigger refresh
          setData(cached.data);
          setLoading(false);
          return 'stale';
        }
      }
      return null;
    } catch (err) {
      console.error('Cache read error:', err);
      return null;
    }
  }, [key, staleWhileRevalidate, ttl]);

  const setCache = useCallback(async (value: T) => {
    try {
      const db = await getDB();
      await db.put('cache', {
        data: value,
        timestamp: Date.now(),
        ttl,
      }, key);
    } catch (err) {
      console.error('Cache write error:', err);
    }
  }, [key, ttl]);

  const refresh = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const result = await fetcher();
      setData(result);
      await setCache(result);
      setError(null);
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      if (!silent) setLoading(false);
    }
  }, [fetcher, setCache]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const cached = await getCached();
      
      if (cached === 'stale') {
        // Silently refresh in background
        refresh(true);
        return;
      }
      
      if (cached && mounted) {
        setData(cached);
        setLoading(false);
        return;
      }

      // No cache, fetch fresh
      if (mounted) {
        await refresh();
      }
    })();

    return () => {
      mounted = false;
    };
  }, [key]);

  // Prefetch in background
  useEffect(() => {
    if (prefetch && !loading && !data) {
      refresh(true);
    }
  }, [prefetch]);

  const invalidate = useCallback(async () => {
    try {
      const db = await getDB();
      await db.delete('cache', key);
      await refresh();
    } catch (err) {
      console.error('Cache invalidation error:', err);
    }
  }, [key, refresh]);

  return {
    data,
    loading,
    error,
    refresh,
    invalidate,
  };
}

// Prefetch helper
export const prefetchCache = async <T,>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = 5 * 60 * 1000
) => {
  try {
    const db = await getDB();
    const cached = await db.get('cache', key);
    
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return; // Already cached and fresh
    }

    const data = await fetcher();
    await db.put('cache', {
      data,
      timestamp: Date.now(),
      ttl,
    }, key);
  } catch (err) {
    console.error('Prefetch error:', err);
  }
};

// Clear all cache
export const clearAllCache = async () => {
  try {
    const db = await getDB();
    await db.clear('cache');
  } catch (err) {
    console.error('Clear cache error:', err);
  }
};
