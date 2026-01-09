import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

/**
 * Native Haptic Feedback Hook
 * Provides tactile feedback for user interactions - makes app feel native
 */
export const useNativeHaptics = () => {
  const isAvailable = Capacitor.isNativePlatform();

  const light = async () => {
    if (!isAvailable) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {
      // Silently fail
    }
  };

  const medium = async () => {
    if (!isAvailable) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (e) {
      // Silently fail
    }
  };

  const heavy = async () => {
    if (!isAvailable) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (e) {
      // Silently fail
    }
  };

  const success = async () => {
    if (!isAvailable) return;
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch (e) {
      // Silently fail
    }
  };

  const warning = async () => {
    if (!isAvailable) return;
    try {
      await Haptics.notification({ type: NotificationType.Warning });
    } catch (e) {
      // Silently fail
    }
  };

  const error = async () => {
    if (!isAvailable) return;
    try {
      await Haptics.notification({ type: NotificationType.Error });
    } catch (e) {
      // Silently fail
    }
  };

  const selectionChanged = async () => {
    if (!isAvailable) return;
    try {
      await Haptics.selectionStart();
    } catch (e) {
      // Silently fail
    }
  };

  return {
    light,
    medium,
    heavy,
    success,
    warning,
    error,
    selectionChanged,
    isAvailable
  };
};
