/**
 * CHATR — organic acquisition attribution.
 *
 * Records ONLY real, observed visitor signals: landing path, referrer, UTM
 * parameters and (when present) the search query a click arrived with. Nothing
 * is estimated, modelled or back-filled. If a signal is absent it stays null,
 * and the row is still honest about that.
 *
 * First-touch is stored once per browser; last-touch is overwritten each visit.
 */

import { supabase } from '@/integrations/supabase/client';

const FIRST_TOUCH_KEY = 'chatr.seo.firstTouch';
const SESSION_KEY = 'chatr.seo.sessionId';

export interface TouchData {
  landing_path: string;
  referrer: string | null;
  referrer_host: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  /** Search query, only when the referrer actually exposes one. */
  search_query: string | null;
  occurred_at: string;
}

const param = (params: URLSearchParams, key: string) => params.get(key) || null;

const sessionId = (): string => {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
};

export const readCurrentTouch = (): TouchData => {
  const url = new URL(window.location.href);
  const params = url.searchParams;
  const referrer = document.referrer || null;

  let referrerHost: string | null = null;
  let searchQuery: string | null = null;
  if (referrer) {
    try {
      const ref = new URL(referrer);
      referrerHost = ref.hostname;
      searchQuery = ref.searchParams.get('q') || ref.searchParams.get('query') || null;
    } catch {
      referrerHost = null;
    }
  }

  return {
    landing_path: url.pathname,
    referrer,
    referrer_host: referrerHost,
    utm_source: param(params, 'utm_source'),
    utm_medium: param(params, 'utm_medium'),
    utm_campaign: param(params, 'utm_campaign'),
    utm_content: param(params, 'utm_content'),
    utm_term: param(params, 'utm_term'),
    search_query: searchQuery,
    occurred_at: new Date().toISOString(),
  };
};

const readFirstTouch = (current: TouchData): TouchData => {
  try {
    const stored = localStorage.getItem(FIRST_TOUCH_KEY);
    if (stored) return JSON.parse(stored) as TouchData;
    localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(current));
  } catch {
    /* storage unavailable — treat this visit as first touch */
  }
  return current;
};

/** Fire-and-forget: never blocks or breaks rendering. */
export const captureAcquisition = async (): Promise<void> => {
  if (typeof window === 'undefined') return;

  const current = readCurrentTouch();
  const first = readFirstTouch(current);

  // Nothing observable and no landing signal worth storing.
  const hasSignal =
    Boolean(current.referrer) ||
    Boolean(current.utm_source) ||
    Boolean(current.utm_campaign) ||
    Boolean(current.search_query);

  try {
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from('seo_attribution').insert({
      session_id: sessionId(),
      user_id: auth?.user?.id ?? null,
      host: window.location.host,
      landing_path: current.landing_path,
      first_touch: first as unknown as Record<string, unknown>,
      last_touch: current as unknown as Record<string, unknown>,
      referrer_host: current.referrer_host,
      utm_source: current.utm_source,
      utm_medium: current.utm_medium,
      utm_campaign: current.utm_campaign,
      search_query: current.search_query,
      has_external_signal: hasSignal,
    });
  } catch (error) {
    // Attribution is never allowed to surface an error to the user.
    console.debug('[seo] attribution capture skipped:', error);
  }
};
