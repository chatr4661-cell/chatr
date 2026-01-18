import { useState, useCallback } from 'react';

/**
 * Stub for gesture detection - disabled to reduce bundle size.
 * Re-enable by installing @mediapipe/tasks-vision.
 */

export function useGestureDetection(_onGestureDetected: (gesture: string) => void) {
  const [isReady] = useState(false);
  const [error] = useState<string | null>('Gesture detection is disabled');

  const detectGesture = useCallback((_video: HTMLVideoElement) => {
    // No-op: gesture detection disabled
  }, []);

  return { isReady, error, detectGesture };
}
