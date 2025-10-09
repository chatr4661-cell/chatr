import React, { useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

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

    try {
      switch (event) {
        case 'answer':
        case 'success':
          await Haptics.notification({ type: NotificationType.Success });
          break;
        
        case 'reject':
        case 'end':
          await Haptics.notification({ type: NotificationType.Warning });
          break;
        
        case 'error':
          await Haptics.notification({ type: NotificationType.Error });
          break;
        
        case 'mute':
          await Haptics.impact({ style: ImpactStyle.Medium });
          break;
        
        case 'unmute':
          await Haptics.impact({ style: ImpactStyle.Light });
          break;
        
        case 'cameraSwitch':
          // Double tap pattern
          await Haptics.impact({ style: ImpactStyle.Light });
          await new Promise(resolve => setTimeout(resolve, 50));
          await Haptics.impact({ style: ImpactStyle.Light });
          break;
        
        case 'qualityChange':
          await Haptics.impact({ style: ImpactStyle.Heavy });
          break;
      }
    } catch (error) {
      console.error('Haptic feedback failed:', error);
    }
  }, [isNative]);

  return { trigger };
}
