import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Native haptic feedback (like Instagram, WhatsApp)
 * Makes the app feel tactile and responsive
 */
export const useNativeHaptics = () => {
  const isNative = Capacitor.isNativePlatform();

  const light = async () => {
    if (!isNative) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {
      console.warn('Haptics not available');
    }
  };

  const medium = async () => {
    if (!isNative) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (e) {
      console.warn('Haptics not available');
    }
  };

  const heavy = async () => {
    if (!isNative) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (e) {
      console.warn('Haptics not available');
    }
  };

  const success = async () => {
    if (!isNative) return;
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch (e) {
      console.warn('Haptics not available');
    }
  };

  const warning = async () => {
    if (!isNative) return;
    try {
      await Haptics.notification({ type: NotificationType.Warning });
    } catch (e) {
      console.warn('Haptics not available');
    }
  };

  const error = async () => {
    if (!isNative) return;
    try {
      await Haptics.notification({ type: NotificationType.Error });
    } catch (e) {
      console.warn('Haptics not available');
    }
  };

  return {
    light,
    medium,
    heavy,
    success,
    warning,
    error
  };
};
