import { supabase } from '@/integrations/supabase/client';
import { backendConfig, SESSION_EXCHANGE_FUNCTION } from './config';
import { deactivateCurrentDevice } from './DeviceManager';

/**
 * SessionManager — single implementation of CHATR backend JWT session handling,
 * shared by every client (web domains, desktop, Android, iOS, macOS).
 */

export const getSession = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
};

/** Trusted user check — re-validates the token with the auth server. */
export const getUser = async () => {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
};

export const onAuthStateChange = (
  cb: (event: string, session: Awaited<ReturnType<typeof getSession>>) => void
) => supabase.auth.onAuthStateChange((event, session) => cb(event, session as any));

export const setSessionFromTokens = async (accessToken: string, refreshToken: string) => {
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) throw error;
};

/**
 * Exchange a Google-verified Firebase ID token for a backend JWT session via
 * the shared edge function. Identical for all domains — no per-domain
 * duplication, and no client-side credential derivation of any kind.
 */
export const exchangeFirebaseSession = async (params: {
  phoneNumber: string;
  idToken: string;
}): Promise<void> => {
  const { url, publishableKey } = backendConfig;
  if (!url || !publishableKey) {
    throw new Error('Authentication service is not configured. Please contact support.');
  }

  const endpoint = `${url}/functions/v1/${SESSION_EXCHANGE_FUNCTION}`;
  const body = JSON.stringify({
    phone_number: params.phoneNumber.replace(/\s/g, ''),
    firebase_id_token: params.idToken,
  });

  // Mobile Safari aborts in-flight requests when the user leaves the tab to
  // read the SMS ("TypeError: Load failed"). Wait until the page is visible
  // again, then retry with backoff before surfacing an error.
  const whenVisible = async () => {
    if (typeof document === 'undefined' || document.visibilityState === 'visible') return;
    await new Promise<void>((resolve) => {
      const onVisible = () => {
        if (document.visibilityState === 'visible') {
          document.removeEventListener('visibilitychange', onVisible);
          resolve();
        }
      };
      document.addEventListener('visibilitychange', onVisible);
      setTimeout(() => {
        document.removeEventListener('visibilitychange', onVisible);
        resolve();
      }, 8000);
    });
  };

  const attempt = async (): Promise<Response> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      return await fetch(endpoint, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publishableKey}`,
          apikey: publishableKey,
        },
        body,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  };

  let response: Response | null = null;
  let networkError: unknown = null;

  for (let i = 0; i < 3; i++) {
    await whenVisible();
    try {
      response = await attempt();
      networkError = null;
      break;
    } catch (err) {
      networkError = err;
      await new Promise((r) => setTimeout(r, 600 * (i + 1)));
    }
  }

  if (!response) {
    console.error('[Auth Exchange] Network failure:', networkError);
    throw new Error('Network problem while signing you in. Please tap Verify again.');
  }

  const responseText = await response.text().catch(() => '');
  let data: { error?: string; session?: { access_token?: string; refresh_token?: string } } = {};

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error('[Auth Exchange] Non-JSON response:', response.status, responseText.slice(0, 200));
    }
  }

  if (!response.ok || data.error) {
    if (response.status === 404) {
      throw new Error('Authentication service is unavailable. Please contact support.');
    }
    throw new Error(data.error || `Authentication failed (${response.status}). Please try again.`);
  }

  if (!data.session?.access_token || !data.session.refresh_token) {
    throw new Error('Authentication completed without a valid session. Please try again.');
  }

  await setSessionFromTokens(data.session.access_token, data.session.refresh_token);
};

/**
 * Centralized logout: deactivates the device session, clears caches, marks an
 * explicit sign-out, then signs out of the backend.
 */
export const signOut = async (): Promise<void> => {
  await deactivateCurrentDevice();

  try {
    sessionStorage.setItem('chatr_explicit_signout', '1');
  } catch {}

  try {
    const { instantCache } = await import('@/hooks/useInstantCache');
    instantCache.clearAll();
    localStorage.removeItem('chatr_recent_activity');
  } catch {}

  await supabase.auth.signOut();
};
