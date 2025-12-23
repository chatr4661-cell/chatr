import { useEffect, useRef, useState } from "react";
import { Video, Camera as CameraIcon } from "lucide-react";
import { Capacitor } from "@capacitor/core";

export default function FameCamViewfinder() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [facingMode]);

  const startCamera = async () => {
    try {
      // Use high-quality settings for FameCam
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setHasPermission(true);
      }
    } catch (error) {
      console.error('Camera access error:', error);
      setHasPermission(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current?.srcObject) {
      const oldStream = videoRef.current.srcObject as MediaStream;
      oldStream.getTracks().forEach(track => track.stop());
    }
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

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
          />
          
          {/* Camera Switch Button (only on native/mobile) */}
          {Capacitor.isNativePlatform() && (
            <button
              onClick={switchCamera}
              className="absolute bottom-24 right-6 bg-black/50 backdrop-blur-sm p-3 rounded-full border border-white/20 active:scale-95 transition-transform"
            >
              <CameraIcon className="w-6 h-6 text-white" />
            </button>
          )}
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
