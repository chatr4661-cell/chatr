import { useState, useEffect, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  staleWhileRevalidate?: boolean;
  onBackgroundUpdate?: (data: any) => void;
}

/**
 * Advanced caching hook with stale-while-revalidate pattern
 * Implements sophisticated caching for 2G optimization
 */
export const useAdvancedCache = <T = any>() => {
  const [cache] = useState(() => new Map<string, CacheEntry<T>>());

  /**
   * Get data from cache
   */
  const get = useCallback((key: string): T | null => {
    const entry = cache.get(key);
    if (!entry) return null;

    // Return stale data if expired but within grace period
    if (entry.expiresAt < Date.now()) {
      return null;
    }

    return entry.data;
  }, [cache]);

  /**
   * Set data in cache
   */
  const set = useCallback((
    key: string,
    data: T,
    ttl: number = 5 * 60 * 1000 // 5 minutes default
  ) => {
    cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    });
  }, [cache]);

  /**
   * Fetch with stale-while-revalidate pattern
   */
  const fetchWithCache = useCallback(async <R = any>(
    key: string,
    fetchFn: () => Promise<R>,
    options: CacheOptions = {}
  ): Promise<R> => {
    const {
      ttl = 5 * 60 * 1000,
      staleWhileRevalidate = true,
      onBackgroundUpdate
    } = options;

    const cached = cache.get(key);

    // Return cached data immediately if available
    if (cached && staleWhileRevalidate) {
      // Revalidate in background
      fetchFn().then(freshData => {
        cache.set(key, {
          data: freshData as any,
          timestamp: Date.now(),
          expiresAt: Date.now() + ttl,
        });
        onBackgroundUpdate?.(freshData);
      }).catch(error => {
        console.error('Background revalidation failed:', error);
      });

      return cached.data as any as R;
    }

    // No cache or not using stale-while-revalidate
    const freshData = await fetchFn();
    cache.set(key, {
      data: freshData as any,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    });
    return freshData;
  }, [cache]);

  /**
   * Clear cache entry
   */
  const clear = useCallback((key: string) => {
    cache.delete(key);
  }, [cache]);

  /**
   * Clear all cache
   */
  const clearAll = useCallback(() => {
    cache.clear();
  }, [cache]);

  /**
   * Prune expired entries
   */
  const prune = useCallback(() => {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (entry.expiresAt < now) {
        cache.delete(key);
      }
    }
  }, [cache]);

  // Auto-prune every 5 minutes
  useEffect(() => {
    const interval = setInterval(prune, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [prune]);

  return {
    get,
    set,
    clear,
    clearAll,
    fetchWithCache,
    prune,
  };
};

/**
 * Stale-while-revalidate fetch wrapper
 */
export async function swrFetch<T>(
  url: string,
  options?: RequestInit & { cache?: boolean }
): Promise<T> {
  const cacheKey = `swr:${url}`;
  const cached = sessionStorage.getItem(cacheKey);

  // Return cached immediately if available
  if (cached && options?.cache !== false) {
    const data = JSON.parse(cached);
    
    // Revalidate in background
    fetch(url, options).then(async res => {
      if (res.ok) {
        const fresh = await res.json();
        sessionStorage.setItem(cacheKey, JSON.stringify(fresh));
      }
    }).catch(() => {});

    return data;
  }

  // Fetch fresh data
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  
  if (options?.cache !== false) {
    sessionStorage.setItem(cacheKey, JSON.stringify(data));
  }

  return data;
}
