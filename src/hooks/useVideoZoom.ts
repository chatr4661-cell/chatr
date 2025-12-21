import { useState, useRef, useCallback, useEffect } from 'react';

interface ZoomState {
  scale: number;
  translateX: number;
  translateY: number;
}

interface UseVideoZoomOptions {
  minScale?: number;
  maxScale?: number;
  enabled?: boolean;
}

export function useVideoZoom(options: UseVideoZoomOptions = {}) {
  const { minScale = 1, maxScale = 4, enabled = true } = options;
  
  const [zoomState, setZoomState] = useState<ZoomState>({
    scale: 1,
    translateX: 0,
    translateY: 0,
  });
  
  const initialDistance = useRef<number | null>(null);
  const initialScale = useRef<number>(1);
  const lastTouchTime = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const getDistance = (touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    
    // Double tap to reset
    const now = Date.now();
    if (e.touches.length === 1 && now - lastTouchTime.current < 300) {
      setZoomState({ scale: 1, translateX: 0, translateY: 0 });
    }
    lastTouchTime.current = now;
    
    // Pinch to zoom
    if (e.touches.length === 2) {
      initialDistance.current = getDistance(e.touches[0], e.touches[1]);
      initialScale.current = zoomState.scale;
    }
  }, [enabled, zoomState.scale]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || e.touches.length !== 2 || initialDistance.current === null) return;
    
    e.preventDefault();
    
    const currentDistance = getDistance(e.touches[0], e.touches[1]);
    const scaleChange = currentDistance / initialDistance.current;
    let newScale = initialScale.current * scaleChange;
    
    // Clamp scale
    newScale = Math.max(minScale, Math.min(maxScale, newScale));
    
    // Calculate center point for zoom
    const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    
    // Adjust translation based on zoom center
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const offsetX = centerX - rect.left - rect.width / 2;
      const offsetY = centerY - rect.top - rect.height / 2;
      
      const scaleDiff = newScale - zoomState.scale;
      const translateX = zoomState.translateX - offsetX * scaleDiff * 0.1;
      const translateY = zoomState.translateY - offsetY * scaleDiff * 0.1;
      
      // Limit translation based on scale
      const maxTranslate = (newScale - 1) * 100;
      
      setZoomState({
        scale: newScale,
        translateX: Math.max(-maxTranslate, Math.min(maxTranslate, translateX)),
        translateY: Math.max(-maxTranslate, Math.min(maxTranslate, translateY)),
      });
    } else {
      setZoomState(prev => ({ ...prev, scale: newScale }));
    }
  }, [enabled, minScale, maxScale, zoomState.scale, zoomState.translateX, zoomState.translateY]);

  const handleTouchEnd = useCallback(() => {
    initialDistance.current = null;
  }, []);

  // Wheel zoom for desktop
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!enabled) return;
    
    e.preventDefault();
    
    const delta = -e.deltaY * 0.01;
    let newScale = zoomState.scale + delta;
    newScale = Math.max(minScale, Math.min(maxScale, newScale));
    
    setZoomState(prev => ({ ...prev, scale: newScale }));
  }, [enabled, minScale, maxScale, zoomState.scale]);

  const resetZoom = useCallback(() => {
    setZoomState({ scale: 1, translateX: 0, translateY: 0 });
  }, []);

  const zoomIn = useCallback(() => {
    setZoomState(prev => ({
      ...prev,
      scale: Math.min(maxScale, prev.scale + 0.5),
    }));
  }, [maxScale]);

  const zoomOut = useCallback(() => {
    setZoomState(prev => ({
      ...prev,
      scale: Math.max(minScale, prev.scale - 0.5),
    }));
  }, [minScale]);

  // Attach event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('wheel', handleWheel);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd, handleWheel]);

  const style: React.CSSProperties = {
    transform: `scale(${zoomState.scale}) translate(${zoomState.translateX}px, ${zoomState.translateY}px)`,
    transformOrigin: 'center center',
    transition: initialDistance.current ? 'none' : 'transform 0.1s ease-out',
  };

  return {
    containerRef,
    style,
    scale: zoomState.scale,
    isZoomed: zoomState.scale > 1,
    resetZoom,
    zoomIn,
    zoomOut,
  };
}
