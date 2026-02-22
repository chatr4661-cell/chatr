import { useEffect, useRef, useState } from "react";
import { Video, Camera as CameraIcon } from "lucide-react";
import { acquireCameraTrack, hasMultipleCameras, shouldMirrorVideo, type FacingMode } from "@/utils/crossPlatformCamera";

export default function FameCamViewfinder() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<FacingMode>('user');
  const [showSwitchBtn, setShowSwitchBtn] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    startCamera();
    hasMultipleCameras().then(setShowSwitchBtn);
    return () => stopCamera();
  }, [facingMode]);

  const startCamera = async () => {
    try {
      const currentTrack = stream?.getVideoTracks()[0] ?? null;
      const result = await acquireCameraTrack(facingMode, currentTrack);
      
      if (result && videoRef.current) {
        // Stop old stream
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        
        const newStream = new MediaStream([result.track]);
        videoRef.current.srcObject = newStream;
        videoRef.current.style.transform = shouldMirrorVideo(result.actualFacing) ? 'scaleX(-1)' : 'none';
        setStream(newStream);
        setHasPermission(true);
        setFacingMode(result.actualFacing);
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

  const switchCamera = async () => {
    if (isSwitching) return;
    setIsSwitching(true);
    try {
      const newFacing: FacingMode = facingMode === 'user' ? 'environment' : 'user';
      setFacingMode(newFacing);
    } finally {
      setIsSwitching(false);
    }
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
          
          {/* Camera Switch Button — shown on ALL platforms with multiple cameras */}
          {showSwitchBtn && (
            <button
              onClick={switchCamera}
              disabled={isSwitching}
              className="absolute bottom-24 right-6 bg-black/50 backdrop-blur-sm p-3 rounded-full border border-white/20 active:scale-95 transition-transform disabled:opacity-50"
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
