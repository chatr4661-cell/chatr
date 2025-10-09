import { useEffect, useState, useCallback, useRef } from 'react';

interface UsePictureInPictureOptions {
  videoRef: React.RefObject<HTMLVideoElement>;
  enabled?: boolean;
}

export function usePictureInPicture({ videoRef, enabled = true }: UsePictureInPictureOptions) {
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [isPiPSupported, setIsPiPSupported] = useState(false);

  useEffect(() => {
    // Check if PiP is supported
    const supported = document.pictureInPictureEnabled && videoRef.current !== null;
    setIsPiPSupported(supported);
  }, [videoRef]);

  const enterPiP = useCallback(async () => {
    if (!videoRef.current || !isPiPSupported || !enabled) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      }
      await videoRef.current.requestPictureInPicture();
      setIsPiPActive(true);
    } catch (error) {
      console.error('Failed to enter Picture-in-Picture:', error);
    }
  }, [videoRef, isPiPSupported, enabled]);

  const exitPiP = useCallback(async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiPActive(false);
      }
    } catch (error) {
      console.error('Failed to exit Picture-in-Picture:', error);
    }
  }, []);

  const togglePiP = useCallback(async () => {
    if (isPiPActive) {
      await exitPiP();
    } else {
      await enterPiP();
    }
  }, [isPiPActive, enterPiP, exitPiP]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnterPiP = () => setIsPiPActive(true);
    const handleLeavePiP = () => setIsPiPActive(false);

    video.addEventListener('enterpictureinpicture', handleEnterPiP);
    video.addEventListener('leavepictureinpicture', handleLeavePiP);

    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnterPiP);
      video.removeEventListener('leavepictureinpicture', handleLeavePiP);
    };
  }, [videoRef]);

  // Auto-enter PiP when user switches tabs/apps
  useEffect(() => {
    if (!enabled || !isPiPSupported) return;

    const handleVisibilityChange = () => {
      if (document.hidden && !isPiPActive && videoRef.current) {
        enterPiP();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enabled, isPiPSupported, isPiPActive, enterPiP, videoRef]);

  return {
    isPiPActive,
    isPiPSupported,
    enterPiP,
    exitPiP,
    togglePiP
  };
}
