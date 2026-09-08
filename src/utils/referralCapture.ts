/**
 * Referral & campaign capture.
 *
 * Shared invite links look like:  https://chatr.chat/?ref=CHATRAB12CD&utm_*
 * Until now nothing read that parameter, so every shared install was
 * unattributed and the referrer never got paid. This module:
 *
 *  1. On app boot, reads `ref` + UTM parameters from the URL and persists
 *     them (first-touch wins — an existing stored code is never overwritten
 *     by a later, weaker click).
 *  2. After a new user completes sign-up, `claimStoredReferral(userId)` hands
 *     the code to the process-referral function exactly once.
 *
 * Everything here is fire-and-forget: a referral failure must never block or
 * break sign-in.
 */

import { supabase } from '@/integrations/supabase/client';

const REF_KEY = 'chatr_ref_code';
const UTM_KEY = 'chatr_utm';
const CLAIMED_KEY = 'chatr_ref_claimed';

const VALID_CODE = /^[A-Z0-9]{4,24}$/i;

/** Call once at app start. Captures ?ref= and UTM tags from the URL. */
export function captureReferralFromUrl(): void {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);

    const ref = params.get('ref')?.trim();
    if (ref && VALID_CODE.test(ref) && !localStorage.getItem(REF_KEY)) {
      localStorage.setItem(REF_KEY, ref.toUpperCase());
    }

    const utm: Record<string, string> = {};
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']) {
      const value = params.get(key);
      if (value) utm[key] = value.slice(0, 100);
    }
    if (Object.keys(utm).length > 0 && !localStorage.getItem(UTM_KEY)) {
      localStorage.setItem(UTM_KEY, JSON.stringify({ ...utm, landed_at: new Date().toISOString() }));
    }
  } catch {
    // Storage unavailable (private mode) — referral simply won't attribute.
  }
}

export function getStoredReferralCode(): string | null {
  try {
    return localStorage.getItem(REF_KEY);
  } catch {
    return null;
  }
}

export function getStoredUtm(): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(UTM_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : null;
  } catch {
    return null;
  }
}

/**
 * After a NEW user signs in, attribute them to the stored referral code.
 * Runs at most once per device. Never throws.
 */
export async function claimStoredReferral(newUserId: string): Promise<void> {
  try {
    const code = getStoredReferralCode();
    if (!code) return;
    if (localStorage.getItem(CLAIMED_KEY) === code) return;

    const { error } = await supabase.functions.invoke('process-referral', {
      body: { referralCode: code, newUserId },
    });

    // Mark claimed even on "already referred" responses so we don't spam
    // the function on every subsequent login.
    if (!error || /already/i.test(String((error as { message?: string })?.message ?? ''))) {
      localStorage.setItem(CLAIMED_KEY, code);
    }
  } catch (err) {
    console.warn('[Referral] Claim skipped:', err);
  }
}
