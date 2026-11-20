/**
 * CHATR STAGING FEATURE FLAGS
 * Controlled change-management for the "Private Browser-Based Calling" pivot.
 * Zero destructive modifications: all legacy modules remain preserved and can be restored
 * by toggling PRIVATE_CALLING_HERO_VIEW to false.
 */

export const STAGING_FEATURE_FLAGS = {
  // Master Flag: When true, transforms Homepage into the razor-sharp Private Calling landing view
  PRIVATE_CALLING_HERO_VIEW: true,

  // Module Level Toggles (Controls rendering on Index.tsx)
  SHOW_HEALTHCARE_CARD: false,
  SHOW_DHANDHA_CARD: false,
  SHOW_EARN_COINS_CARD: false,
  SHOW_COMMERCIAL_GATEWAY: false, // Disables TalentXcel Academy floating video overlay

  // Security Toggles
  ENFORCE_TWO_PARTICIPANT_LIMIT: true,
  ENFORCE_EPHEMERAL_ROOM_SLUGS: true,
  DISABLE_INSECURE_CLIENT_SECRETS: true,
} as const;

export function isPrivateCallingHeroEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const override = localStorage.getItem('chatr_flag_hero_override');
    if (override !== null) return override === 'true';
  } catch {}
  return STAGING_FEATURE_FLAGS.PRIVATE_CALLING_HERO_VIEW;
}
