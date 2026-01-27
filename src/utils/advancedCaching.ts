/**
 * ADVANCED CACHING STRATEGIES
 * Implements multi-layer caching for 10x faster data loading
 */

// Memory cache for ultra-fast access
const memoryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Check memory cache first (sub-millisecond access)
export const getFromMemory = <T>(key: string): T | null => {
  const cached = memoryCache.get(key);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > cached.ttl) {
    memoryCache.delete(key);
    return null;
  }
  
  return cached.data as T;
};

// Set in memory cache
export const setInMemory = <T>(key: string, data: T, ttlMs: number = 60000): void => {
  memoryCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlMs,
  });
};

// IndexedDB for persistent cache
const DB_NAME = 'chatr-perf-cache';
const DB_VERSION = 1;
const STORE_NAME = 'cache';

let dbPromise: Promise<IDBDatabase> | null = null;

const getDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
  
  return dbPromise;
};

// Get from IndexedDB (10-50ms)
export const getFromDB = async <T>(key: string): Promise<T | null> => {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      
      request.onsuccess = () => {
        const cached = request.result;
        if (!cached) {
          resolve(null);
          return;
        }
        
        if (Date.now() - cached.timestamp > cached.ttl) {
          // Expired, clean up async
          setInDB(key, null, 0).catch(() => {});
          resolve(null);
          return;
        }
        
        // Also populate memory cache
        setInMemory(key, cached.data, cached.ttl - (Date.now() - cached.timestamp));
        resolve(cached.data);
      };
      
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
};

// Set in IndexedDB
export const setInDB = async <T>(key: string, data: T, ttlMs: number = 300000): Promise<void> => {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      
      if (data === null) {
        store.delete(key);
      } else {
        store.put({ data, timestamp: Date.now(), ttl: ttlMs }, key);
      }
      
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Silently fail
  }
};

// Multi-layer cache fetch with stale-while-revalidate
export const cachedFetch = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    memoryTtl?: number;
    dbTtl?: number;
    staleWhileRevalidate?: boolean;
  } = {}
): Promise<T> => {
  const { memoryTtl = 60000, dbTtl = 300000, staleWhileRevalidate = true } = options;
  
  // Layer 1: Memory cache (instant)
  const memoryResult = getFromMemory<T>(key);
  if (memoryResult !== null) {
    return memoryResult;
  }
  
  // Layer 2: IndexedDB (fast)
  const dbResult = await getFromDB<T>(key);
  if (dbResult !== null) {
    // Populate memory cache
    setInMemory(key, dbResult, memoryTtl);
    
    // Background refresh if stale-while-revalidate
    if (staleWhileRevalidate) {
      fetcher().then(freshData => {
        setInMemory(key, freshData, memoryTtl);
        setInDB(key, freshData, dbTtl);
      }).catch(() => {});
    }
    
    return dbResult;
  }
  
  // Layer 3: Network fetch
  const freshData = await fetcher();
  
  // Populate both caches
  setInMemory(key, freshData, memoryTtl);
  setInDB(key, freshData, dbTtl);
  
  return freshData;
};

// Clear all caches
export const clearAllCaches = async (): Promise<void> => {
  memoryCache.clear();
  
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
  } catch {
    // Silently fail
  }
};

// Preload critical data into cache
export const preloadCriticalData = async (fetchers: Record<string, () => Promise<any>>): Promise<void> => {
  const entries = Object.entries(fetchers);
  
  // Fetch in parallel
  await Promise.allSettled(
    entries.map(async ([key, fetcher]) => {
      try {
        const data = await fetcher();
        setInMemory(key, data, 120000); // 2 min memory
        setInDB(key, data, 600000); // 10 min DB
      } catch {
        // Silently fail individual fetches
      }
    })
  );
};

// Export cache stats for monitoring
export const getCacheStats = () => ({
  memorySize: memoryCache.size,
  memoryKeys: Array.from(memoryCache.keys()),
});
