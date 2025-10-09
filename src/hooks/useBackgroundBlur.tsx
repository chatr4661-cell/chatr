import React, { useEffect, useRef, useState, useCallback } from 'react';

interface UseBackgroundBlurOptions {
  videoRef: React.RefObject<HTMLVideoElement>;
  enabled: boolean;
  blurAmount?: number;
}

export function useBackgroundBlur({ 
  videoRef, 
  enabled, 
  blurAmount = 10 
}: UseBackgroundBlurOptions) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [processedStream, setProcessedStream] = useState<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();

  const applyBlur = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !enabled) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Apply blur filter
    ctx.filter = `blur(${blurAmount}px)`;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';

    // Continue processing
    animationFrameRef.current = requestAnimationFrame(applyBlur);
  }, [videoRef, enabled, blurAmount]);

  useEffect(() => {
    if (!enabled) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setProcessedStream(null);
      return;
    }

    // Create canvas for processing
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }

    const canvas = canvasRef.current;

    // Start processing
    applyBlur();

    // Get stream from canvas
    const stream = canvas.captureStream(30); // 30 fps
    setProcessedStream(stream);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, applyBlur]);

  return {
    processedStream,
    canvas: canvasRef.current
  };
}
