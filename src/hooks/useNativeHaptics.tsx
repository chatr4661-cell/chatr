import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@/utils/haptics';

/**
 * Native Haptic Feedback Hook
 * Provides tactile feedback for user interactions - makes app feel native
 */
export const useNativeHaptics = () => {
  const isAvailable = Capacitor.isNativePlatform();

  const light = async () => {
    if (!isAvailable) return;
    await Haptics.impact('Light');
  };

  const medium = async () => {
    if (!isAvailable) return;
    await Haptics.impact('Medium');
  };

  const heavy = async () => {
    if (!isAvailable) return;
    await Haptics.impact('Heavy');
  };

  const success = async () => {
    if (!isAvailable) return;
    await Haptics.notification('Success');
  };

  const warning = async () => {
    if (!isAvailable) return;
    await Haptics.notification('Warning');
  };

  const error = async () => {
    if (!isAvailable) return;
    await Haptics.notification('Error');
  };

  const selectionChanged = async () => {
    if (!isAvailable) return;
    await Haptics.selectionStart();
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
