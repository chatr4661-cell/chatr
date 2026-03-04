import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Ultra-fast localStorage cache hook for instant page hydration.
 * Uses localStorage (sync read on mount) instead of IndexedDB (async)
 * so cached data is available on the FIRST RENDER FRAME — zero flicker.
 *
 * TTL: 3–5 minutes (configurable). Stale-while-revalidate by default.
 */

const DEFAULT_TTL = 3 * 60 * 1000; // 3 minutes

interface CacheEntry<T> {
  d: T;       // data
  t: number;  // timestamp
}

// ── Sync read (runs before first paint) ──
function readCache<T>(key: string, ttl: number): T | null {
  try {
    const raw = localStorage.getItem(`ic_${key}`);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    // Allow stale up to 2× TTL for stale-while-revalidate
    if (Date.now() - entry.t > ttl * 2) {
      localStorage.removeItem(`ic_${key}`);
      return null;
    }
    return entry.d;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { d: data, t: Date.now() };
    localStorage.setItem(`ic_${key}`, JSON.stringify(entry));
  } catch {
    // Storage full — evict oldest ic_ keys
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith('ic_')) keys.push(k);
      }
      if (keys.length > 0) {
        // Remove first 3 oldest
        keys.slice(0, 3).forEach(k => localStorage.removeItem(k));
        const entry: CacheEntry<T> = { d: data, t: Date.now() };
        localStorage.setItem(`ic_${key}`, JSON.stringify(entry));
      }
    } catch {}
  }
}

function isFresh(key: string, ttl: number): boolean {
  try {
    const raw = localStorage.getItem(`ic_${key}`);
    if (!raw) return false;
    const entry = JSON.parse(raw);
    return Date.now() - entry.t < ttl;
  } catch {
    return false;
  }
}

/**
 * useInstantCache — drop-in replacement for useState + useEffect fetch pattern.
 *
 * @example
 * const { data, loading } = useInstantCache('activity-widgets', fetchWidgetData, { ttl: 180_000 });
 */
export function useInstantCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: { ttl?: number; enabled?: boolean } = {}
) {
  const { ttl = DEFAULT_TTL, enabled = true } = options;
  const cached = readCache<T>(key, ttl);
  const [data, setData] = useState<T | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    // If cache is fresh, skip network entirely
    if (isFresh(key, ttl)) return;

    // Stale or missing — fetch in background
    const doFetch = async () => {
      try {
        const result = await fetcherRef.current();
        if (cancelled) return;
        setData(result);
        writeCache(key, result);
      } catch (err) {
        console.error(`[InstantCache] ${key} fetch error:`, err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    doFetch();
    return () => { cancelled = true; };
  }, [key, ttl, enabled]);

  const invalidate = useCallback(() => {
    localStorage.removeItem(`ic_${key}`);
    setLoading(true);
    fetcherRef.current().then(result => {
      setData(result);
      writeCache(key, result);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [key]);

  return { data, loading, invalidate };
}

/**
 * Standalone cache helpers for non-hook contexts (prefetch, service workers, etc.)
 */
export const instantCache = {
  read: readCache,
  write: writeCache,
  isFresh,
  clear: (key: string) => {
    try { localStorage.removeItem(`ic_${key}`); } catch {}
  },
  clearAll: () => {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith('ic_')) keys.push(k);
      }
      keys.forEach(k => localStorage.removeItem(k));
    } catch {}
  }
};
