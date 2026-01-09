/**
 * Safe Haptics Wrapper
 * Handles Capacitor haptics safely for both native and web environments
 */

import { Capacitor } from '@capacitor/core';

// Lazy-loaded haptics module
let HapticsModule: typeof import('@capacitor/haptics') | null = null;

export const ImpactStyle = {
  Heavy: 'HEAVY',
  Medium: 'MEDIUM', 
  Light: 'LIGHT'
} as const;

export const NotificationType = {
  Success: 'SUCCESS',
  Warning: 'WARNING',
  Error: 'ERROR'
} as const;

/**
 * Safely load haptics module only on native platforms
 */
const loadHaptics = async () => {
  if (HapticsModule) return HapticsModule;
  
  if (!Capacitor.isNativePlatform()) {
    return null;
  }
  
  try {
    HapticsModule = await import('@capacitor/haptics');
    return HapticsModule;
  } catch (error) {
    console.log('Haptics not available:', (error as Error).message?.slice(0, 30));
    return null;
  }
};

/**
 * Trigger impact haptic feedback
 */
export const impact = async (style: keyof typeof ImpactStyle = 'Medium') => {
  const module = await loadHaptics();
  if (!module) return;
  
  try {
    await module.Haptics.impact({ style: module.ImpactStyle[style] });
  } catch {
    // Silently fail
  }
};

/**
 * Trigger notification haptic feedback
 */
export const notification = async (type: keyof typeof NotificationType = 'Success') => {
  const module = await loadHaptics();
  if (!module) return;
  
  try {
    await module.Haptics.notification({ type: module.NotificationType[type] });
  } catch {
    // Silently fail
  }
};

/**
 * Trigger vibration
 */
export const vibrate = async (duration = 300) => {
  const module = await loadHaptics();
  if (!module) return;
  
  try {
    await module.Haptics.vibrate({ duration });
  } catch {
    // Silently fail
  }
};

/**
 * Trigger selection haptic (light tap)
 */
export const selectionStart = async () => {
  const module = await loadHaptics();
  if (!module) return;
  
  try {
    await module.Haptics.selectionStart();
  } catch {
    // Silently fail
  }
};

export const selectionEnd = async () => {
  const module = await loadHaptics();
  if (!module) return;
  
  try {
    await module.Haptics.selectionEnd();
  } catch {
    // Silently fail
  }
};

// Export a Haptics-like object for compatibility
export const Haptics = {
  impact,
  notification,
  vibrate,
  selectionStart,
  selectionEnd
};
