import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

/**
 * Handles Android hardware back button
 * Makes navigation feel native
 */
export const useAndroidBackButton = (canGoBack: boolean = true) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listener: any;
    
    const setupListener = async () => {
      listener = await App.addListener('backButton', ({ canGoBack: systemCanGoBack }) => {
        if (canGoBack && systemCanGoBack) {
          // Go back in app navigation
          navigate(-1);
        } else {
          // Exit app or show exit confirmation
          App.exitApp();
        }
      });
    };
    
    setupListener();

    return () => {
      if (listener) {
        listener.remove();
      }
    };
  }, [canGoBack, navigate]);
};
