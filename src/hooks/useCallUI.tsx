import React, { useState, useEffect, useCallback, useRef } from "react";

interface UseCallUIOptions {
  autoHideDelay?: number;
  enabled?: boolean;
}

export function useCallUI({ autoHideDelay = 3000, enabled = true }: UseCallUIOptions = {}) {
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimerRef = useRef<NodeJS.Timeout>();

  const showControls = useCallback(() => {
    setControlsVisible(true);
    
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    if (enabled) {
      hideTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, autoHideDelay);
    }
  }, [autoHideDelay, enabled]);

  const hideControls = useCallback(() => {
    setControlsVisible(false);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
  }, []);

  const toggleControls = useCallback(() => {
    if (controlsVisible) {
      hideControls();
    } else {
      showControls();
    }
  }, [controlsVisible, showControls, hideControls]);

  // Reset timer on any interaction
  useEffect(() => {
    if (!enabled) return;

    const resetTimer = () => {
      showControls();
    };

    // Listen for any user interaction
    window.addEventListener('click', resetTimer);
    window.addEventListener('touchstart', resetTimer);
    window.addEventListener('mousemove', resetTimer);

    return () => {
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
      window.removeEventListener('mousemove', resetTimer);
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [enabled, showControls]);

  return {
    controlsVisible,
    showControls,
    hideControls,
    toggleControls
  };
}
