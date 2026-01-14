import { useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { App } from '@capacitor/app';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Apple-like Native Features Hook
 * Provides seamless iOS/Android native integration with:
 * - Status bar control (edge-to-edge)
 * - Keyboard animation sync
 * - Back gesture polish
 * - Haptic feedback
 * - Safe area management
 */
export const useAppleNativeFeatures = () => {
  const isNative = Capacitor.isNativePlatform();
  const navigate = useNavigate();
  const location = useLocation();
  const keyboardHeightRef = useRef(0);
  const gestureStartRef = useRef<number | null>(null);

  // Status Bar Configuration - Edge-to-edge
  const configureStatusBar = useCallback(async (style: 'light' | 'dark' = 'dark') => {
    if (!isNative) return;
    try {
      // Make content go behind status bar (edge-to-edge)
      await StatusBar.setOverlaysWebView({ overlay: true });
      
      // Set status bar style based on theme
      await StatusBar.setStyle({ 
        style: style === 'light' ? Style.Light : Style.Dark 
      });
      
      // Transparent status bar background
      if (Capacitor.getPlatform() === 'android') {
        await StatusBar.setBackgroundColor({ color: '#00000000' });
      }
    } catch (e) {
      console.log('StatusBar config failed:', e);
    }
  }, [isNative]);

  // Hide status bar (for full-screen modes like calls)
  const hideStatusBar = useCallback(async () => {
    if (!isNative) return;
    try {
      await StatusBar.hide();
    } catch (e) {}
  }, [isNative]);

  // Show status bar
  const showStatusBar = useCallback(async () => {
    if (!isNative) return;
    try {
      await StatusBar.show();
    } catch (e) {}
  }, [isNative]);

  // Keyboard Animation Sync
  useEffect(() => {
    if (!isNative) return;

    let showListener: any;
    let hideListener: any;

    const setupKeyboard = async () => {
      try {
        // iOS-style keyboard animation sync
        showListener = await Keyboard.addListener('keyboardWillShow', (info) => {
          keyboardHeightRef.current = info.keyboardHeight;
          
          // Apply smooth animation to body
          document.body.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
          document.body.classList.add('keyboard-animating');
          document.body.classList.add('keyboard-visible');
          
          // Trigger haptic on keyboard appear
          Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
          
          // Smooth animation timing
          requestAnimationFrame(() => {
            document.body.classList.remove('keyboard-animating');
          });
        });

        hideListener = await Keyboard.addListener('keyboardWillHide', () => {
          keyboardHeightRef.current = 0;
          
          document.body.classList.add('keyboard-animating');
          document.body.style.setProperty('--keyboard-height', '0px');
          
          setTimeout(() => {
            document.body.classList.remove('keyboard-visible');
            document.body.classList.remove('keyboard-animating');
          }, 280); // Match iOS keyboard animation duration
        });
      } catch (e) {
        console.log('Keyboard setup failed:', e);
      }
    };

    setupKeyboard();

    return () => {
      showListener?.remove?.();
      hideListener?.remove?.();
    };
  }, [isNative]);

  // Back Gesture Polish (iOS swipe-back, Android back button)
  useEffect(() => {
    if (!isNative) return;

    let backListener: any;

    const setupBackHandler = async () => {
      backListener = await App.addListener('backButton', ({ canGoBack }) => {
        // Check if we can navigate back in-app
        const historyLength = window.history.length;
        const isOnRootPage = ['/', '/home', '/chatr-home', '/auth'].includes(location.pathname);

        if (!isOnRootPage && historyLength > 1) {
          // Haptic feedback on back
          Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
          navigate(-1);
        } else {
          // On root pages, minimize app (Android) or do nothing (iOS)
          if (Capacitor.getPlatform() === 'android') {
            App.minimizeApp();
          }
        }
      });
    };

    setupBackHandler();

    return () => {
      backListener?.remove?.();
    };
  }, [isNative, navigate, location.pathname]);

  // Swipe-back gesture detection (for edge swipe)
  useEffect(() => {
    if (!isNative) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      // Detect edge swipe (from left 20px edge)
      if (touch.clientX < 20) {
        gestureStartRef.current = touch.clientX;
        document.body.classList.add('gesture-active');
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (gestureStartRef.current === null) return;
      
      const touch = e.touches[0];
      const delta = touch.clientX - gestureStartRef.current;
      
      // Apply visual feedback during swipe
      if (delta > 0 && delta < 150) {
        document.body.style.setProperty('--swipe-progress', `${delta}px`);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (gestureStartRef.current === null) return;
      
      const touch = e.changedTouches[0];
      const delta = touch.clientX - gestureStartRef.current;
      
      // If swiped enough (> 100px), navigate back
      if (delta > 100) {
        Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
        navigate(-1);
      }
      
      gestureStartRef.current = null;
      document.body.classList.remove('gesture-active');
      document.body.style.setProperty('--swipe-progress', '0px');
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isNative, navigate]);

  // Haptic Feedback Utilities
  const haptics = {
    light: () => isNative && Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}),
    medium: () => isNative && Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {}),
    heavy: () => isNative && Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {}),
    success: () => isNative && Haptics.notification({ type: NotificationType.Success }).catch(() => {}),
    warning: () => isNative && Haptics.notification({ type: NotificationType.Warning }).catch(() => {}),
    error: () => isNative && Haptics.notification({ type: NotificationType.Error }).catch(() => {}),
    selection: () => isNative && Haptics.selectionStart().catch(() => {}),
  };

  // Initial setup
  useEffect(() => {
    if (!isNative) return;
    
    // Configure status bar on mount
    const isDark = document.documentElement.classList.contains('dark');
    configureStatusBar(isDark ? 'light' : 'dark');
    
    // Listen for theme changes
    const observer = new MutationObserver(() => {
      const isDarkNow = document.documentElement.classList.contains('dark');
      configureStatusBar(isDarkNow ? 'light' : 'dark');
    });
    
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });

    return () => observer.disconnect();
  }, [isNative, configureStatusBar]);

  return {
    isNative,
    configureStatusBar,
    hideStatusBar,
    showStatusBar,
    haptics,
    keyboardHeight: keyboardHeightRef.current,
  };
};

export default useAppleNativeFeatures;
