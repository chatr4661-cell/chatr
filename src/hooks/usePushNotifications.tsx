import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const usePushNotifications = (userId?: string) => {
  useEffect(() => {
    if (!userId) return;

    // Only set up push notifications on native platforms
    if (!Capacitor.isNativePlatform()) {
      console.log('Push notifications only available on native platforms');
      return;
    }

    const setupPushNotifications = async () => {
      try {
        // Request permission
        const permission = await PushNotifications.requestPermissions();
        
        if (permission.receive === 'granted') {
          await PushNotifications.register();
        } else {
          console.log('Push notification permission denied');
          return;
        }

        // Handle registration
        await PushNotifications.addListener('registration', async (token) => {
          console.log('Push registration success, token:', token.value);
          
          // Save token to backend
          try {
            const platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web';
            const { error } = await supabase
              .from('device_tokens')
              .upsert({
                user_id: userId,
                device_token: token.value,
                platform: platform,
                last_used_at: new Date().toISOString(),
              }, {
                onConflict: 'device_token'
              });

            if (error) {
              console.error('Error saving device token:', error);
            } else {
              console.log('✅ Device token saved successfully');
            }
          } catch (error) {
            console.error('Error saving device token:', error);
          }
        });

        // Handle registration errors
        await PushNotifications.addListener('registrationError', (error) => {
          console.error('Error on registration:', error);
        });

        // Handle notifications received while app is in foreground
        await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push notification received:', notification);
          toast(notification.title || 'New notification', {
            description: notification.body
          });
        });

        // Handle notification tapped
        await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('Push notification action performed:', notification);
          // TODO: Navigate to relevant screen based on notification data
        });
      } catch (error) {
        console.error('Error setting up push notifications:', error);
      }
    };

    setupPushNotifications();

    // Cleanup
    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [userId]);
};
