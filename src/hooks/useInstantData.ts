import { useState, useEffect, useCallback } from 'react';
import { cachedFetch, getFromMemory, setInMemory } from '@/utils/advancedCaching';

/**
 * INSTANT DATA HOOK
 * Provides cached-first data loading with background refresh
 * Achieves sub-100ms perceived data loading
 */

interface UseInstantDataOptions<T> {
  key: string;
  fetcher: () => Promise<T>;
  initialData?: T;
  memoryTtl?: number;
  dbTtl?: number;
  staleWhileRevalidate?: boolean;
  refetchOnMount?: boolean;
  refetchOnFocus?: boolean;
}

interface UseInstantDataResult<T> {
  data: T | null;
  isLoading: boolean;
  isStale: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  invalidate: () => void;
}

export function useInstantData<T>({
  key,
  fetcher,
  initialData = null as T,
  memoryTtl = 60000,
  dbTtl = 300000,
  staleWhileRevalidate = true,
  refetchOnMount = true,
  refetchOnFocus = false,
}: UseInstantDataOptions<T>): UseInstantDataResult<T> {
  // Try to get from memory cache synchronously for instant display
  const cachedData = getFromMemory<T>(key);
  
  const [data, setData] = useState<T | null>(cachedData || initialData);
  const [isLoading, setIsLoading] = useState(!cachedData);
  const [isStale, setIsStale] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const freshData = await cachedFetch(key, fetcher, {
        memoryTtl,
        dbTtl,
        staleWhileRevalidate: false, // We're explicitly refreshing
      });
      setData(freshData);
      setIsStale(false);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [key, fetcher, memoryTtl, dbTtl]);

  const invalidate = useCallback(() => {
    setIsStale(true);
    // Trigger background refresh
    refresh();
  }, [refresh]);

  // Initial load with cache-first strategy
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        // If we already have cached data, mark as potentially stale
        if (cachedData) {
          setIsStale(true);
        }

        const result = await cachedFetch(key, fetcher, {
          memoryTtl,
          dbTtl,
          staleWhileRevalidate,
        });

        if (mounted) {
          setData(result);
          setIsLoading(false);
          setIsStale(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
          setIsLoading(false);
        }
      }
    };

    if (refetchOnMount || !cachedData) {
      loadData();
    } else {
      setIsLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [key]);

  // Refetch on focus
  useEffect(() => {
    if (!refetchOnFocus) return;

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };

    document.addEventListener('visibilitychange', handleFocus);
    return () => document.removeEventListener('visibilitychange', handleFocus);
  }, [refetchOnFocus, refresh]);

  return { data, isLoading, isStale, error, refresh, invalidate };
}

/**
 * Preload data into cache before navigation
 */
export const preloadData = async <T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<void> => {
  try {
    const data = await fetcher();
    setInMemory(key, data, 120000);
  } catch {
    // Silently fail
  }
};

/**
 * Batch preload multiple data sources
 */
export const batchPreload = async (
  fetchers: Array<{ key: string; fetcher: () => Promise<any> }>
): Promise<void> => {
  await Promise.allSettled(
    fetchers.map(({ key, fetcher }) => preloadData(key, fetcher))
  );
};
