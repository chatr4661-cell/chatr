import { useState, useCallback, useRef, useEffect } from 'react';

export type BackgroundType = 'none' | 'blur' | 'image' | 'color';

interface VirtualBackgroundConfig {
  type: BackgroundType;
  blurAmount?: number; // 0-20
  imageUrl?: string;
  color?: string;
}

export const useVirtualBackground = () => {
  const [config, setConfig] = useState<VirtualBackgroundConfig>({ type: 'none' });
  const [isProcessing, setIsProcessing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const presetBackgrounds = [
    { id: 'office', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800', name: 'Office' },
    { id: 'nature', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800', name: 'Nature' },
    { id: 'beach', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800', name: 'Beach' },
    { id: 'mountains', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800', name: 'Mountains' },
    { id: 'city', url: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800', name: 'City' },
    { id: 'abstract', url: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=800', name: 'Abstract' },
  ];

  const presetColors = [
    '#1a1a2e', '#16213e', '#0f3460', '#533483',
    '#e94560', '#f39189', '#bb86fc', '#03dac6'
  ];

  const setBlur = useCallback((amount: number = 10) => {
    setConfig({ type: 'blur', blurAmount: Math.min(20, Math.max(0, amount)) });
  }, []);

  const setImage = useCallback((imageUrl: string) => {
    setConfig({ type: 'image', imageUrl });
  }, []);

  const setColor = useCallback((color: string) => {
    setConfig({ type: 'color', color });
  }, []);

  const clearBackground = useCallback(() => {
    setConfig({ type: 'none' });
  }, []);

  // Apply background effect to video stream using CSS filters (simplified approach)
  const applyToStream = useCallback(async (stream: MediaStream): Promise<MediaStream> => {
    if (config.type === 'none') return stream;
    
    setIsProcessing(true);
    
    try {
      // For blur, we use CSS filter on the video element
      // For image/color backgrounds, we'd need MediaPipe or TensorFlow.js for segmentation
      // This is a simplified implementation that works with CSS
      
      // In production, you'd use:
      // - @mediapipe/selfie_segmentation for person segmentation
      // - Canvas API to composite background
      
      return stream;
    } finally {
      setIsProcessing(false);
    }
  }, [config]);

  const getVideoStyle = useCallback((): React.CSSProperties => {
    if (config.type === 'blur') {
      return {
        filter: `blur(${config.blurAmount || 10}px)`,
        transform: 'scale(1.1)', // Compensate for blur edge artifacts
      };
    }
    return {};
  }, [config]);

  return {
    config,
    isProcessing,
    presetBackgrounds,
    presetColors,
    setBlur,
    setImage,
    setColor,
    clearBackground,
    applyToStream,
    getVideoStyle,
    canvasRef,
    videoRef,
  };
};
