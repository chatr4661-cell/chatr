// CHATR SI Router — Supabase client
// Production project: nuuuqazaoaozgblmvkzn
// Anon / Publishable key is public by design (safe to commit).
// V2 portability: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in deployment env
// to redirect to a different project without modifying this file.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const getEnv = (key: string) => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) return (import.meta as any).env[key];
  return undefined;
};

// Read from environment first (V2 portability); fall back to production values
const SUPABASE_URL = getEnv('VITE_SUPABASE_URL') || 'https://nuuuqazaoaozgblmvkzn.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_PUBLISHABLE_KEY') || 'sb_publishable_HRiuUoHejwLnOdITsW36Ew_ZSZ513Tw';

// Resilient storage wrapper with memory fallback
const memoryStorage = new Map<string, string>();

// One-time cleanup: remove tokens from old/wrong Supabase projects
if (typeof window !== 'undefined') {
  try {
    const keysToCheck = [
      'sb-cenxckpxaqborfqyexot-auth-token',
      'sb-sbayuqgomlflmxgicplz-auth-token',
      'sb-auth-token',
    ];
    for (const key of keysToCheck) {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        const accessToken = (typeof parsed === 'object' && parsed !== null) ? (parsed as any)?.access_token : undefined;
        if (accessToken && typeof accessToken === 'string') {
          // Decode JWT payload to check project ref
          const parts = accessToken.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            // If token is not from nuuuqazaoaozgblmvkzn, purge it
            if (payload?.iss && !payload.iss.includes('nuuuqazaoaozgblmvkzn')) {
              console.debug('[SupabaseStorage] Purging stale token from wrong project:', key);
              window.localStorage.removeItem(key);
            }
          }
        } else {
          // No valid access_token object, remove raw or corrupt entry
          window.localStorage.removeItem(key);
        }
      } catch {
        // Corrupt JSON — remove it
        window.localStorage.removeItem(key);
      }
    }
  } catch (e) {
    console.debug('[SupabaseStorage] Startup cleanup failed:', e);
  }
}

const resilientStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return memoryStorage.get(key) || null;
    try {
      let val = window.localStorage.getItem(key);
      // Fallback cross-check between storage keys to ensure session continuity
      if (!val && key === 'sb-nuuuqazaoaozgblmvkzn-auth-token') {
        const rawFallback = window.localStorage.getItem('sb-auth-token');
        if (rawFallback) {
          try {
            const parsed = JSON.parse(rawFallback);
            if (parsed && typeof parsed === 'object' && parsed.access_token) {
              val = rawFallback;
            } else {
              window.localStorage.removeItem('sb-auth-token');
            }
          } catch {
            window.localStorage.removeItem('sb-auth-token');
          }
        }
      }
      return val || memoryStorage.get(key) || null;
    } catch {
      return memoryStorage.get(key) || null;
    }
  },
  setItem: (key: string, value: string): void => {
    memoryStorage.set(key, value);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(key, value);
        if (key === 'sb-nuuuqazaoaozgblmvkzn-auth-token') {
          window.localStorage.setItem('sb-auth-token', value);
        }
      } catch (e) {
        console.warn('[SupabaseStorage] LocalStorage write failed, preserved in memory:', e);
      }
    }
  },
  removeItem: (key: string): void => {
    memoryStorage.delete(key);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(key);
        if (key === 'sb-nuuuqazaoaozgblmvkzn-auth-token') {
          window.localStorage.removeItem('sb-auth-token');
        }
      } catch (removeErr) {
        console.debug('[SupabaseStorage] LocalStorage remove failed:', removeErr);
      }
    }
  }
};

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: resilientStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});