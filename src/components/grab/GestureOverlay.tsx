import { useEffect, useRef, useState } from 'react';
import { Hands, Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { Button } from '@/components/ui/button';
import { Hand, X, Camera as CameraIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { GestureFSM, GestureState, HandLandmarks } from '@/utils/GestureFSM';
import { Capacitor } from '@capacitor/core';
import { useNativeHaptics } from '@/hooks/useNativeHaptics';

interface GestureOverlayProps {
  onScreenshotCaptured: (blob: Blob) => void;
  onClose: () => void;
}

export default function GestureOverlay({ onScreenshotCaptured, onClose }: GestureOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fsmRef = useRef<GestureFSM | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [gestureState, setGestureState] = useState<GestureState>('idle');
  const [boundingBox, setBoundingBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  
  const { triggerHaptic } = useNativeHaptics();

  useEffect(() => {
    initializeGesture();
    return () => cleanup();
  }, []);

  const initializeGesture = async () => {
    try {
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }

      // Initialize MediaPipe Hands
      const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7
      });

      hands.onResults(onHandsResults);

      // Initialize camera
      if (videoRef.current) {
        const camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current) {
              await hands.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480
        });
        camera.start();
      }

      // Initialize FSM
      fsmRef.current = new GestureFSM({
        stableFrames: 6,
        cooldownMs: 2000,
        distanceCheckEnabled: true
      });

      fsmRef.current.setCallbacks(
        (state) => {
          setGestureState(state);
          if (state === 'captured') {
            triggerHaptic('medium');
          }
        },
        () => {
          captureScreenshot();
        }
      );

      setIsLoading(false);
      toast.success('Gesture detection active', {
        description: 'Open palm → close fist to capture'
      });

    } catch (error) {
      console.error('Error initializing gesture:', error);
      toast.error('Camera access denied', {
        description: 'Please enable camera permissions'
      });
      setIsLoading(false);
    }
  };

  const onHandsResults = (results: Results) => {
    if (!canvasRef.current || !fsmRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Process hands
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const handLandmarks: HandLandmarks[] = results.multiHandLandmarks.map((landmarks, idx) => ({
        landmarks: landmarks as Array<{ x: number; y: number; z: number }>,
        handedness: results.multiHandedness?.[idx]?.label || 'Unknown'
      }));

      // Update FSM
      fsmRef.current.processFrame(handLandmarks);

      // Draw bounding box
      const landmarks = handLandmarks[0].landmarks;
      let minX = 1, minY = 1, maxX = 0, maxY = 0;
      
      landmarks.forEach(lm => {
        minX = Math.min(minX, lm.x);
        minY = Math.min(minY, lm.y);
        maxX = Math.max(maxX, lm.x);
        maxY = Math.max(maxY, lm.y);
      });

      const box = {
        x: minX * canvas.width,
        y: minY * canvas.height,
        width: (maxX - minX) * canvas.width,
        height: (maxY - minY) * canvas.height
      };
      setBoundingBox(box);

      // Draw box with state-based color
      const color = gestureState === 'detecting_open' ? '#10b981' : 
                    gestureState === 'captured' ? '#ef4444' : '#3b82f6';
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(box.x, box.y, box.width, box.height);

      // Draw landmarks
      landmarks.forEach(lm => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 4, 0, 2 * Math.PI);
        ctx.fill();
      });
    } else {
      setBoundingBox(null);
      fsmRef.current.processFrame([]);
    }
  };

  const captureScreenshot = async () => {
    try {
      // Capture using HTML2Canvas for web or native screenshot API
      if (Capacitor.isNativePlatform()) {
        // Use Capacitor Screenshot plugin
        const { Screenshot } = await import('@capacitor/screenshot');
        const result = await Screenshot.take();
        
        // Convert base64 to blob
        const response = await fetch(`data:image/jpeg;base64,${result.base64}`);
        const blob = await response.blob();
        
        onScreenshotCaptured(blob);
        toast.success('Screenshot captured!');
      } else {
        // Web: capture using canvas
        const canvas = document.createElement('canvas');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          // Capture entire viewport
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // For demo: capture the page content
          const html2canvas = (await import('html2canvas')).default;
          const screenshot = await html2canvas(document.body, {
            ignoreElements: (element) => {
              return element.classList.contains('gesture-overlay');
            }
          });
          
          screenshot.toBlob((blob) => {
            if (blob) {
              onScreenshotCaptured(blob);
              toast.success('Screenshot captured!');
            }
          }, 'image/png');
        }
      }
    } catch (error) {
      console.error('Screenshot capture error:', error);
      toast.error('Failed to capture screenshot');
    }
  };

  const cleanup = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  return (
    <div className="gesture-overlay fixed inset-0 z-50 bg-black/90 backdrop-blur-sm">
      {/* Camera Preview */}
      <div className="absolute top-4 right-4 w-48 h-36 bg-black rounded-lg overflow-hidden border-2 border-primary">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover transform scale-x-[-1]"
        />
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="absolute inset-0 w-full h-full transform scale-x-[-1]"
        />
      </div>

      {/* Status Panel */}
      <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md rounded-lg p-4 border border-primary/20">
        <div className="flex items-center gap-3 mb-3">
          <Hand className={`w-6 h-6 ${cameraActive ? 'text-primary animate-pulse' : 'text-gray-500'}`} />
          <div>
            <p className="text-white font-medium">Gesture Detection</p>
            <p className="text-sm text-gray-400">
              {gestureState === 'idle' && 'Show open palm to start'}
              {gestureState === 'detecting_open' && 'Palm detected - now close fist!'}
              {gestureState === 'captured' && 'Captured! ✓'}
              {gestureState === 'cooldown' && 'Cooldown...'}
            </p>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Initializing camera...</span>
          </div>
        )}

        {boundingBox && (
          <div className="text-xs text-gray-500 mt-2">
            Hand size: {Math.round(boundingBox.width)}x{Math.round(boundingBox.height)}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md rounded-lg p-6 max-w-md text-center border border-primary/20">
        <h3 className="text-white font-semibold mb-2">How to Capture</h3>
        <ol className="text-gray-300 text-sm space-y-2 text-left">
          <li>1. Show your open palm to the camera</li>
          <li>2. Keep it steady for 1 second</li>
          <li>3. Close your hand into a fist</li>
          <li>4. Screenshot captured automatically!</li>
        </ol>
      </div>

      {/* Close Button */}
      <Button
        onClick={onClose}
        variant="destructive"
        className="absolute bottom-4 left-1/2 -translate-x-1/2"
      >
        <X className="w-4 h-4 mr-2" />
        Close Gesture Mode
      </Button>
    </div>
  );
}
