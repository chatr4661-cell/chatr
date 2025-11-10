import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { Network } from '@capacitor/network';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceFingerprint, getDeviceName, getDeviceType } from '@/utils/deviceFingerprint';

/**
 * Comprehensive native app initialization
 * Handles all native features, permissions, and device setup
 */
export const useNativeAppInitialization = (userId?: string) => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let networkListener: any;
    let appStateListener: any;
    let urlListener: any;
    let backButtonListener: any;

    const initializeNativeFeatures = async () => {
      try {
        console.log('🚀 Initializing native app features...');

        // 1. Hide splash screen after short delay for branding
        setTimeout(async () => {
          await SplashScreen.hide();
        }, 1500);

        // 2. Configure status bar
        if (Capacitor.getPlatform() !== 'web') {
          await StatusBar.setStyle({ style: Style.Light });
          await StatusBar.setBackgroundColor({ color: '#6200ee' });
          await StatusBar.setOverlaysWebView({ overlay: true });
        }

        // 3. Configure keyboard (skip - causes build error)
        // Keyboard configuration happens in useNativeOptimizations

        // 4. Register device session (optional - may require schema)
        if (userId) {
          try {
            const fingerprint = await getDeviceFingerprint();
            const deviceName = await getDeviceName();
            const deviceType = await getDeviceType();

            await supabase.from('device_sessions').upsert([{
              device_fingerprint: fingerprint,
              device_name: deviceName,
              device_type: deviceType,
              is_active: true,
              last_active: new Date().toISOString(),
              user_id: userId,
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              session_token: crypto.randomUUID(),
            }], {
              onConflict: 'device_fingerprint'
            });

            console.log('✅ Device session registered');
          } catch (err) {
            // Silently fail - device_sessions may not be in schema yet
            console.log('Device session registration skipped');
          }
        }

        // 5. Network monitoring
        networkListener = await Network.addListener('networkStatusChange', (status) => {
          if (status.connected) {
            toast.success('Back online', { duration: 2000 });
          } else {
            toast.error('No internet connection', { duration: 3000 });
          }
        });

        // 6. App state handling (resume/pause)
        appStateListener = await App.addListener('appStateChange', ({ isActive }) => {
          console.log('App state changed. Active:', isActive);
          
          if (isActive && userId) {
            // Update last active time
            supabase.from('profiles').update({
              last_seen_at: new Date().toISOString()
            }).eq('id', userId).then(() => {
              console.log('✅ Updated last seen');
            });
          }
        });

        // 7. Deep linking support
        urlListener = await App.addListener('appUrlOpen', ({ url }) => {
          console.log('Deep link received:', url);
          
          // Handle different URL schemes
          // chatr://chat/user123
          // chatr://call/conv456
          // https://chatr.chat/u/username
          
          const path = url.replace(/^(chatr:\/\/|https?:\/\/chatr\.chat\/)/, '');
          
          if (path.startsWith('chat/')) {
            const userId = path.replace('chat/', '');
            window.location.href = `/chat?user=${userId}`;
          } else if (path.startsWith('call/')) {
            const convId = path.replace('call/', '');
            window.location.href = `/chat/${convId}`;
          } else if (path.startsWith('u/')) {
            const username = path.replace('u/', '');
            window.location.href = `/profile/${username}`;
          }
        });

        // 8. Android back button handling
        if (Capacitor.getPlatform() === 'android') {
          backButtonListener = await App.addListener('backButton', ({ canGoBack }) => {
            if (!canGoBack) {
              // Show exit confirmation
              if (confirm('Exit Chatr?')) {
                App.exitApp();
              }
            } else {
              window.history.back();
            }
          });
        }

        // 9. Request critical permissions
        await requestPermissions();

        console.log('✅ Native app initialization complete');

      } catch (error) {
        console.error('❌ Native initialization error:', error);
      }
    };

    const requestPermissions = async () => {
      try {
        // These will be requested as needed by specific features
        // Just log readiness here
        console.log('📱 Native permissions ready for:');
        console.log('  - Push Notifications (on demand)');
        console.log('  - Camera & Microphone (on call)');
        console.log('  - Location (on GPS features)');
        console.log('  - Contacts (on sync)');
        console.log('  - Storage (on media)');
      } catch (error) {
        console.error('Permission setup error:', error);
      }
    };

    initializeNativeFeatures();

    // Cleanup
    return () => {
      networkListener?.remove();
      appStateListener?.remove();
      urlListener?.remove();
      backButtonListener?.remove();
    };
  }, [userId]);
};
