/**
 * Quota-Resilient Storage Engine for Supabase Auth
 * 
 * Prevents "QuotaExceededError: Setting the value of 'sb-...-auth-token' exceeded the quota"
 * by automatically evicting stale temporary cache (instant cache, logs, heavy objects)
 * and providing an in-memory fallback so auth operations NEVER throw or fail.
 */

const memoryStorage = new Map<string, string>();

/**
 * Evict non-essential items from localStorage to ensure auth tokens always have space.
 */
export function evictNonEssentialStorage(bytesNeeded: number = 300_000): number {
  if (typeof window === 'undefined' || !window.localStorage) return 0;
  let freed = 0;

  try {
    const keysToRemove: string[] = [];
    const nonCriticalPrefixes = [
      'ic_',
      'chatr_brain_',
      'chatrBrain_',
      'airrunner_',
      'recent_locations',
      'recent_searches',
      'chatr_search_suggestions',
      'message-queue',
      'chatr_dialer_directory',
      'mood_entries',
      'streaks',
      'chatr_recent_activity',
      'chatr_offline_'
    ];

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      // NEVER touch auth session tokens or user authentication keys
      if (k.includes('auth-token') || k.includes('sb-') || k.includes('supabase') || k.includes('firebase')) {
        continue;
      }

      if (nonCriticalPrefixes.some(p => k.startsWith(p))) {
        keysToRemove.push(k);
      }
    }

    for (const k of keysToRemove) {
      try {
        const val = localStorage.getItem(k);
        if (val) freed += val.length;
        localStorage.removeItem(k);
        if (freed >= bytesNeeded) break;
      } catch {}
    }

    // Secondary pass: if still under quota, evict ANY key that is not auth-related
    if (freed < bytesNeeded) {
      const remainingNonAuth: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && !k.includes('auth-token') && !k.includes('sb-') && !k.includes('supabase') && !k.includes('firebase')) {
          remainingNonAuth.push(k);
        }
      }
      for (const k of remainingNonAuth) {
        try {
          const val = localStorage.getItem(k);
          if (val) freed += val.length;
          localStorage.removeItem(k);
          if (freed >= bytesNeeded) break;
        } catch {}
      }
    }
  } catch (err) {
    console.warn('[safeAuthStorage] Eviction warning:', err);
  }

  return freed;
}

export const DURABLE_AUTH_VAULT_KEY = 'chatr_permanent_session_vault';
export const DURABLE_AUTH_KEY_REF = 'chatr_permanent_session_key';
export const EXPLICIT_SIGNOUT_FLAG = 'chatr_explicit_signout';

export function isAuthTokenKey(key: string): boolean {
  return (
    key.startsWith('sb-') ||
    key.includes('auth-token') ||
    key.includes('supabase.auth') ||
    key === DURABLE_AUTH_VAULT_KEY
  );
}

export function wasExplicitlySignedOut(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return (
      localStorage.getItem(EXPLICIT_SIGNOUT_FLAG) === '1' ||
      sessionStorage.getItem(EXPLICIT_SIGNOUT_FLAG) === '1'
    );
  } catch {
    return false;
  }
}

export function clearExplicitSignoutFlag(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(EXPLICIT_SIGNOUT_FLAG);
    sessionStorage.removeItem(EXPLICIT_SIGNOUT_FLAG);
  } catch {}
}

export function safeSetItem(key: string, value: string): void {
  // Always update memory storage as an instant, unbreakable fallback
  memoryStorage.set(key, value);

  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  // If storing an auth session, ensure explicit signout is cleared and save to permanent vault
  if (isAuthTokenKey(key) && value) {
    clearExplicitSignoutFlag();
    try {
      localStorage.setItem(DURABLE_AUTH_VAULT_KEY, value);
      localStorage.setItem(DURABLE_AUTH_KEY_REF, key);
    } catch {}
  }

  try {
    localStorage.setItem(key, value);
  } catch (err: any) {
    const isQuota =
      err?.name === 'QuotaExceededError' ||
      err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err?.code === 22 ||
      err?.code === 1014 ||
      (typeof err?.message === 'string' && err.message.toLowerCase().includes('quota'));

    if (isQuota) {
      console.warn(`[safeAuthStorage] Quota exceeded for "${key}". Performing emergency cache purge...`);
      evictNonEssentialStorage(value.length + 100_000);
      try {
        localStorage.setItem(key, value);
        console.log(`[safeAuthStorage] Successfully saved "${key}" after cache purge.`);
        return;
      } catch (retryErr) {
        console.warn(`[safeAuthStorage] Storage still full after purge. Session retained in memory.`, retryErr);
      }
    } else {
      console.warn(`[safeAuthStorage] setItem error for "${key}":`, err);
    }
  }
}

export function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return memoryStorage.get(key) ?? null;
  }

  try {
    const val = localStorage.getItem(key);
    if (val !== null && val !== '') return val;

    // Permanent Session Resurrection:
    // If auth token is missing from primary key but was not explicitly signed out,
    // restore it from the permanent vault so the user NEVER gets logged out.
    if (isAuthTokenKey(key) && !wasExplicitlySignedOut()) {
      const vaulted = localStorage.getItem(DURABLE_AUTH_VAULT_KEY);
      if (vaulted) {
        console.log(`[safeAuthStorage] Resurrecting permanent session for "${key}" from vault.`);
        try {
          localStorage.setItem(key, vaulted);
        } catch {}
        memoryStorage.set(key, vaulted);
        return vaulted;
      }
    }

    return memoryStorage.get(key) ?? null;
  } catch {
    return memoryStorage.get(key) ?? null;
  }
}

export function safeRemoveItem(key: string): void {
  // CRITICAL PERMANENT SESSION PROTECTION:
  // If Supabase-js or any background refresh tries to remove the auth token
  // due to a network glitch or timeout, INTERCEPT and PREVENT removal
  // UNLESS the user explicitly initiated a sign-out!
  if (isAuthTokenKey(key) && !wasExplicitlySignedOut()) {
    console.warn(`[safeAuthStorage] Intercepted non-user session eviction attempt for "${key}". Preserving permanent login.`);
    return;
  }

  memoryStorage.delete(key);
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.removeItem(key);
    if (isAuthTokenKey(key) && wasExplicitlySignedOut()) {
      localStorage.removeItem(DURABLE_AUTH_VAULT_KEY);
      localStorage.removeItem(DURABLE_AUTH_KEY_REF);
    }
  } catch {}
}

export function safeAuthStorage() {
  if (typeof window === 'undefined') return undefined;

  // Run initial sanity check on load: if storage test fails, purge immediately
  try {
    const probe = '__storage_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
  } catch {
    console.warn('[safeAuthStorage] Initial storage probe failed. Purging non-essential caches...');
    evictNonEssentialStorage(500_000);
  }

  return {
    getItem: (key: string) => safeGetItem(key),
    setItem: (key: string, value: string) => safeSetItem(key, value),
    removeItem: (key: string) => safeRemoveItem(key),
  };
}
