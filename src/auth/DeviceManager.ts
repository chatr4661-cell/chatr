import { supabase } from '@/integrations/supabase/client';
import { getDeviceFingerprint } from '@/utils/deviceFingerprint';

/**
 * DeviceManager — shared device-session handling for every CHATR client.
 * Device sessions live in one table on the shared backend, so a device linked
 * from chatr.chat is visible from chatrchat.in and the native apps.
 */

export const getFingerprint = getDeviceFingerprint;

export const registerCurrentDevice = async (payload: {
  userId: string;
  deviceName?: string;
  deviceType?: string;
  platform?: string;
}): Promise<void> => {
  try {
    const fingerprint = await getDeviceFingerprint();
    await supabase.from('device_sessions').upsert(
      [
        {
          user_id: payload.userId,
          device_fingerprint: fingerprint,
          device_name: payload.deviceName ?? 'CHATR Client',
          device_type: payload.deviceType ?? 'web',
          platform: payload.platform ?? (typeof navigator !== 'undefined' ? navigator.platform : 'unknown'),
          is_active: true,
          last_active: new Date().toISOString(),
        } as any,
      ],
      { onConflict: 'device_fingerprint' }
    );
  } catch (e) {
    console.warn('[DeviceManager] Device registration skipped:', e);
  }
};

export const findActiveDeviceSession = async () => {
  try {
    const fingerprint = await getDeviceFingerprint();
    const { data } = await supabase
      .from('device_sessions')
      .select('*')
      .eq('device_fingerprint', fingerprint)
      .eq('is_active', true)
      .maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
};

export const deactivateCurrentDevice = async (): Promise<void> => {
  try {
    const fingerprint = await getDeviceFingerprint();
    await supabase
      .from('device_sessions')
      .update({ is_active: false })
      .eq('device_fingerprint', fingerprint);
  } catch (e) {
    console.warn('[DeviceManager] Device session deactivation failed:', e);
  }
};
