import { supabase } from '@/integrations/supabase/client';
import { getDeviceFingerprint } from '@/utils/deviceFingerprint';
import { instantCache } from '@/hooks/useInstantCache';

/**
 * Centralized logout: deactivates device session, clears all caches,
 * marks session as explicitly signed out, then calls supabase signOut.
 */
export async function performLogout(): Promise<void> {
  try {
    // 1. Deactivate device session so Auth page won't re-hydrate
    const fingerprint = await getDeviceFingerprint();
    await supabase
      .from('device_sessions')
      .update({ is_active: false })
      .eq('device_fingerprint', fingerprint);
  } catch (e) {
    console.warn('[Logout] Device session deactivation failed:', e);
  }

  // 2. Mark explicit sign-out so Auth page skips device session check
  try {
    sessionStorage.setItem('chatr_explicit_signout', '1');
  } catch {}

  // 3. Clear all instant caches
  try {
    instantCache.clearAll();
    localStorage.removeItem('chatr_recent_activity');
  } catch {}

  // 4. Sign out from auth
  await supabase.auth.signOut();
}
