import { useEffect, useRef, useState, useCallback } from "react";
import { Video, Camera as CameraIcon, SwitchCamera, Loader2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";

// Check if device has multiple cameras
const isMobileDevice = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

export default function FameCamViewfinder() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isSwitching, setIsSwitching] = useState(false);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  // Check for multiple cameras on mount
  useEffect(() => {
    const checkCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        setHasMultipleCameras(videoInputs.length > 1);
        console.log(`📷 Found ${videoInputs.length} camera(s)`);
      } catch (error) {
        console.log('Could not enumerate devices:', error);
        // Assume mobile has multiple cameras
        setHasMultipleCameras(isMobileDevice());
      }
    };
    checkCameras();
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current?.srcObject) {
      const oldStream = videoRef.current.srcObject as MediaStream;
      oldStream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  const startCamera = useCallback(async (targetFacingMode: 'user' | 'environment') => {
    try {
      // Stop existing stream first
      stopCamera();
      
      // Small delay to ensure camera is released
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Use exact constraint for reliable camera switching
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { exact: targetFacingMode },
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: false
      };

      console.log(`📷 Requesting ${targetFacingMode} camera with exact constraint...`);
      
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play().catch(() => {});
          setStream(mediaStream);
          setHasPermission(true);
          setFacingMode(targetFacingMode);
          console.log(`✅ ${targetFacingMode} camera started successfully`);
        }
      } catch (exactError) {
        console.log(`⚠️ Exact constraint failed, trying ideal constraint...`, exactError);
        
        // Fallback: try with ideal constraint (less strict)
        const fallbackConstraints: MediaStreamConstraints = {
          video: {
            facingMode: targetFacingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          },
          audio: false
        };
        
        const mediaStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play().catch(() => {});
          setStream(mediaStream);
          setHasPermission(true);
          setFacingMode(targetFacingMode);
          console.log(`✅ ${targetFacingMode} camera started with fallback`);
        }
      }
    } catch (error) {
      console.error('Camera access error:', error);
      setHasPermission(false);
      toast.error('Could not access camera');
    }
  }, [stopCamera]);

  useEffect(() => {
    startCamera(facingMode);
    return () => stopCamera();
  }, []); // Only run on mount

  const switchCamera = async () => {
    if (isSwitching) return;
    
    setIsSwitching(true);
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    
    try {
      console.log(`📷 Switching camera from ${facingMode} to ${newMode}...`);
      await startCamera(newMode);
      toast.success(`Switched to ${newMode === 'user' ? 'front' : 'back'} camera`);
    } catch (error) {
      console.error('Camera switch error:', error);
      toast.error('Could not switch camera');
    } finally {
      setIsSwitching(false);
    }
  };

  // Show camera switch on mobile/native OR when multiple cameras detected
  const showCameraSwitch = Capacitor.isNativePlatform() || isMobileDevice() || hasMultipleCameras;

  return (
    <div className="w-full h-full bg-black relative">
      <canvas ref={canvasRef} className="hidden" />
      
      {hasPermission ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
          />
          
          {/* Camera Switch Button */}
          {showCameraSwitch && (
            <button
              onClick={switchCamera}
              disabled={isSwitching}
              className={`absolute bottom-24 right-6 bg-black/50 backdrop-blur-sm p-3 rounded-full border border-white/20 active:scale-95 transition-all ${isSwitching ? 'opacity-50' : ''}`}
            >
              {isSwitching ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <SwitchCamera className="w-6 h-6 text-white" />
              )}
            </button>
          )}
          
          {/* Camera mode indicator */}
          <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full text-xs text-white/70">
            {facingMode === 'user' ? 'Front' : 'Back'}
          </div>
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center text-white/60">
            <Video className="w-16 h-16 mx-auto mb-4" />
            <p>Camera access required</p>
            <p className="text-sm mt-2">Please grant camera permission</p>
          </div>
        </div>
      )}
    </div>
  );
}
