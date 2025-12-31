import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export interface SensorState {
  proximity: boolean; // Phone near ear
  orientation: 'portrait' | 'landscape';
  shakeDetected: boolean;
  facingDown: boolean;
}

export interface CallSensorActions {
  onProximityNear: () => void;
  onProximityFar: () => void;
  onShake: () => void;
  onFaceDown: () => void;
  onFlip: () => void;
}

/**
 * Advanced sensor integration for FaceTime-quality calling
 * - Proximity: Auto-switch to earpiece, turn off screen
 * - Shake: Mute/unmute microphone
 * - Face-down: End call or mute
 * - Orientation: Adjust video layout
 */
export const useCallSensors = (isCallActive: boolean, actions?: Partial<CallSensorActions>) => {
  const [sensorState, setSensorState] = useState<SensorState>({
    proximity: false,
    orientation: 'portrait',
    shakeDetected: false,
    facingDown: false,
  });
  
  const accelerometerRef = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });
  const shakeThreshold = 15;
  const lastShakeTime = useRef<number>(0);
  const lastFlipTime = useRef<number>(0);

  // Haptic feedback for call events
  const triggerHaptic = useCallback(async (type: 'start' | 'end' | 'mute' | 'answer' | 'decline') => {
    if (!Capacitor.isNativePlatform()) return;
    
    try {
      switch (type) {
        case 'start':
          await Haptics.impact({ style: ImpactStyle.Medium });
          break;
        case 'end':
          await Haptics.notification({ type: NotificationType.Warning });
          break;
        case 'answer':
          await Haptics.notification({ type: NotificationType.Success });
          break;
        case 'decline':
          await Haptics.notification({ type: NotificationType.Error });
          break;
        case 'mute':
          await Haptics.impact({ style: ImpactStyle.Light });
          break;
      }
    } catch (e) {
      console.log('Haptics not available');
    }
  }, []);

  // Proximity sensor for auto-earpiece switch
  useEffect(() => {
    if (!isCallActive || !Capacitor.isNativePlatform()) return;

    const handleProximity = (event: any) => {
      const isNear = event.value === 0 || event.near === true;
      setSensorState(prev => ({ ...prev, proximity: isNear }));
      
      if (isNear) {
        actions?.onProximityNear?.();
      } else {
        actions?.onProximityFar?.();
      }
    };

    // Web fallback - use devicemotion for shake detection
    if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
      const handleMotion = (event: DeviceMotionEvent) => {
        const { accelerationIncludingGravity } = event;
        if (!accelerationIncludingGravity) return;

        const { x, y, z } = accelerationIncludingGravity;
        if (x === null || y === null || z === null) return;

        const deltaX = Math.abs(x - accelerometerRef.current.x);
        const deltaY = Math.abs(y - accelerometerRef.current.y);
        const deltaZ = Math.abs(z - accelerometerRef.current.z);

        // Shake detection
        if ((deltaX + deltaY + deltaZ) > shakeThreshold) {
          const now = Date.now();
          if (now - lastShakeTime.current > 1000) {
            lastShakeTime.current = now;
            setSensorState(prev => ({ ...prev, shakeDetected: true }));
            actions?.onShake?.();
            triggerHaptic('mute');
            setTimeout(() => {
              setSensorState(prev => ({ ...prev, shakeDetected: false }));
            }, 500);
          }
        }

        // Face-down detection (z > 9 means gravity pulling screen down)
        const isFacingDown = (z ?? 0) > 9;
        if (isFacingDown && !sensorState.facingDown) {
          const now = Date.now();
          if (now - lastFlipTime.current > 2000) {
            lastFlipTime.current = now;
            actions?.onFaceDown?.();
            actions?.onFlip?.();
          }
        }
        setSensorState(prev => ({ ...prev, facingDown: isFacingDown }));

        accelerometerRef.current = { x: x ?? 0, y: y ?? 0, z: z ?? 0 };
      };

      window.addEventListener('devicemotion', handleMotion);
      return () => window.removeEventListener('devicemotion', handleMotion);
    }
  }, [isCallActive, actions, triggerHaptic, sensorState.facingDown]);

  // Orientation detection
  useEffect(() => {
    if (!isCallActive) return;

    const handleOrientation = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      setSensorState(prev => ({ 
        ...prev, 
        orientation: isLandscape ? 'landscape' : 'portrait' 
      }));
    };

    handleOrientation();
    window.addEventListener('resize', handleOrientation);
    window.addEventListener('orientationchange', handleOrientation);

    return () => {
      window.removeEventListener('resize', handleOrientation);
      window.removeEventListener('orientationchange', handleOrientation);
    };
  }, [isCallActive]);

  return {
    sensorState,
    triggerHaptic,
  };
};
