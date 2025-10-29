import { useEffect, useRef, useState } from 'react';
import { GestureRecognizer, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';

export function useGestureDetection(onGestureDetected: (gesture: string) => void) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const gestureRecognizerRef = useRef<GestureRecognizer | null>(null);
  const lastGestureTimeRef = useRef<number>(0);

  useEffect(() => {
    let isMounted = true;

    const initializeGestureRecognizer = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        const gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
            delegate: 'GPU'
          },
          numHands: 1,
          runningMode: 'VIDEO'
        });

        if (isMounted) {
          gestureRecognizerRef.current = gestureRecognizer;
          setIsReady(true);
        }
      } catch (err) {
        console.error('Failed to initialize gesture recognizer:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize');
        }
      }
    };

    initializeGestureRecognizer();

    return () => {
      isMounted = false;
      if (gestureRecognizerRef.current) {
        gestureRecognizerRef.current.close();
      }
    };
  }, []);

  const detectGesture = (video: HTMLVideoElement) => {
    if (!gestureRecognizerRef.current || !isReady) return;

    try {
      const nowInMs = Date.now();
      const results = gestureRecognizerRef.current.recognizeForVideo(video, nowInMs);

      if (results.gestures.length > 0) {
        const gesture = results.gestures[0][0].categoryName;
        
        // Detect "Open_Palm" gesture and throttle to prevent spam
        if (gesture === 'Open_Palm' && nowInMs - lastGestureTimeRef.current > 2000) {
          lastGestureTimeRef.current = nowInMs;
          onGestureDetected(gesture);
        }
      }
    } catch (err) {
      console.error('Gesture detection error:', err);
    }
  };

  return { isReady, error, detectGesture };
}
