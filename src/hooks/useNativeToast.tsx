import { Capacitor } from '@capacitor/core';
import { Toast } from '@capacitor/toast';
import { toast as sonnerToast } from 'sonner';

/**
 * Native toast notifications (faster than web toasts)
 */
export const useNativeToast = () => {
  const showToast = async (message: string, duration: 'short' | 'long' = 'short') => {
    try {
      if (Capacitor.isNativePlatform()) {
        await Toast.show({
          text: message,
          duration: duration,
          position: 'bottom',
        });
      } else {
        sonnerToast(message, {
          duration: duration === 'short' ? 2000 : 4000,
        });
      }
    } catch (error) {
      console.error('Error showing toast:', error);
      sonnerToast(message);
    }
  };

  return { showToast };
};
