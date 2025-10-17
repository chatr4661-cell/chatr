import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Network } from '@capacitor/network';
import { SplashScreen } from '@capacitor/splash-screen';
import { Toast } from '@capacitor/toast';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Preferences } from '@capacitor/preferences';
import { Keyboard } from '@capacitor/keyboard';

/**
 * Native performance optimizations for iOS/Android
 * Makes the app feel smooth and responsive like native apps
 */
export const useNativePerformance = () => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const setupPerformance = async () => {
      try {
        // 1. Hide splash as soon as app is ready
        await SplashScreen.hide();
        console.log('✅ Splash screen hidden');

        // 2. Monitor network status
        Network.addListener('networkStatusChange', async (status) => {
          if (!status.connected) {
            await Toast.show({ 
              text: 'No internet connection',
              duration: 'long',
              position: 'bottom'
            });
          } else {
            await Toast.show({ 
              text: 'Back online',
              duration: 'short',
              position: 'bottom'
            });
          }
        });

        // 3. Handle app state (foreground/background)
        App.addListener('appStateChange', async ({ isActive }) => {
          if (!isActive) {
            await Preferences.set({ 
              key: 'lastActive', 
              value: Date.now().toString() 
            });
          } else {
            const { value } = await Preferences.get({ key: 'lastActive' });
            console.log('App resumed, last active:', value);
          }
        });

        // 4. Keyboard optimization
        Keyboard.addListener('keyboardWillShow', (info) => {
          document.body.classList.add('keyboard-visible');
          document.body.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
        });
        
        Keyboard.addListener('keyboardWillHide', () => {
          document.body.classList.remove('keyboard-visible');
          document.body.style.setProperty('--keyboard-height', '0px');
        });

        // 5. Native status bar optimization
        await StatusBar.setOverlaysWebView({ overlay: true });
        await StatusBar.setStyle({ style: Style.Light });
        
        console.log('✅ Native performance optimizations applied');
      } catch (error) {
        console.error('❌ Error setting up native performance:', error);
      }
    };

    setupPerformance();
  }, []);
};
