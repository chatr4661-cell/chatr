import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useNativeHaptics } from './useNativeHaptics';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
}

/**
 * Native pull-to-refresh (like Instagram, Twitter)
 * Works on both web and native platforms
 */
export const useNativePullToRefresh = ({ 
  onRefresh, 
  threshold = 80 
}: UsePullToRefreshOptions) => {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const haptics = useNativeHaptics();

  useEffect(() => {
    const container = document.getElementById('pull-to-refresh-container');
    if (!container) return;

    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger at top of scroll
      if (container.scrollTop === 0) {
        touchStartY = e.touches[0].clientY;
        startY.current = touchStartY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (container.scrollTop !== 0 || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const distance = currentY - startY.current;

      if (distance > 0) {
        setIsPulling(true);
        setPullDistance(Math.min(distance, threshold * 1.5));

        // Haptic feedback at threshold
        if (distance >= threshold && !isRefreshing) {
          haptics.medium();
        }
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        haptics.heavy();
        
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setIsPulling(false);
          setPullDistance(0);
        }
      } else {
        setIsPulling(false);
        setPullDistance(0);
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, threshold, isRefreshing, onRefresh, haptics]);

  return {
    isPulling,
    isRefreshing,
    pullDistance,
    maxDistance: threshold
  };
};
