import { useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Haptics } from '@/utils/haptics';

type HapticEvent = 
  | 'answer' 
  | 'reject' 
  | 'end' 
  | 'mute' 
  | 'unmute' 
  | 'cameraSwitch' 
  | 'qualityChange'
  | 'error'
  | 'success';

export function useCallHaptics() {
  const isNative = Capacitor.isNativePlatform();

  const trigger = useCallback(async (event: HapticEvent) => {
    if (!isNative) return;

    switch (event) {
      case 'answer':
      case 'success':
        await Haptics.notification('Success');
        break;
      
      case 'reject':
      case 'end':
        await Haptics.notification('Warning');
        break;
      
      case 'error':
        await Haptics.notification('Error');
        break;
      
      case 'mute':
        await Haptics.impact('Medium');
        break;
      
      case 'unmute':
        await Haptics.impact('Light');
        break;
      
      case 'cameraSwitch':
        await Haptics.impact('Light');
        await new Promise(resolve => setTimeout(resolve, 50));
        await Haptics.impact('Light');
        break;
      
      case 'qualityChange':
        await Haptics.impact('Heavy');
        break;
    }
  }, [isNative]);

  return { trigger };
}
