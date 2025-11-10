import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Channel } from '@capacitor/push-notifications';
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
        // Create high-priority notification channels for Android
        if (Capacitor.getPlatform() === 'android') {
          await PushNotifications.createChannel({
            id: 'calls',
            name: 'Calls',
            description: 'Incoming call notifications',
            importance: 5, // IMPORTANCE_HIGH
            sound: 'ringtone.mp3',
            vibration: true,
            visibility: 1, // VISIBILITY_PUBLIC - shows on lock screen
          });

          await PushNotifications.createChannel({
            id: 'messages',
            name: 'Messages',
            description: 'Chat message notifications',
            importance: 4, // IMPORTANCE_DEFAULT
            sound: 'notification.mp3',
            vibration: true,
            visibility: 1,
          });

          await PushNotifications.createChannel({
            id: 'urgent',
            name: 'Urgent Notifications',
            description: 'High priority alerts',
            importance: 5,
            sound: 'notification.mp3',
            vibration: true,
            visibility: 1,
          });
        }

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
          console.log('✅ Push registration success, token:', token.value.substring(0, 20) + '...');
          
          // Save token to backend with device info
          try {
            const platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web';
            
            // Get device info
            let deviceInfo: any = { platform };
            try {
              const { Device } = await import('@capacitor/device');
              const info = await Device.getInfo();
              deviceInfo = {
                model: info.model,
                platform: info.platform,
                osVersion: info.osVersion,
                manufacturer: info.manufacturer,
                timestamp: new Date().toISOString()
              };
            } catch (e) {
              console.log('Could not get device info:', e);
            }

            const { error } = await supabase
              .from('device_tokens')
              .upsert({
                user_id: userId,
                device_token: token.value,
                platform: platform === 'ios' ? 'ios' : 'android',
                device_info: deviceInfo,
                last_used_at: new Date().toISOString(),
              }, {
                onConflict: 'user_id,device_token'
              });

            if (error) {
              console.error('❌ Error saving device token:', error);
            } else {
              console.log('✅ Device token saved successfully');
            }
          } catch (error) {
            console.error('❌ Error saving device token:', error);
          }
        });

        // Handle registration errors
        await PushNotifications.addListener('registrationError', (error) => {
          console.error('❌ Error on registration:', error);
        });

        // Handle notifications received while app is in foreground
        await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('📬 Push notification received:', notification);
          toast(notification.title || 'New notification', {
            description: notification.body
          });
        });

        // Handle notification tapped (deep linking)
        await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('👆 Push notification action performed:', notification);
          
          // Handle deep linking based on notification data
          const data = notification.notification.data;
          if (data?.click_action) {
            window.location.href = data.click_action;
          } else if (data?.conversationId) {
            window.location.href = `/chat/${data.conversationId}`;
          } else if (data?.notificationType === 'call') {
            // Handle incoming call navigation
            window.location.href = '/call-history';
          } else {
            // Default: go to notifications page
            window.location.href = '/notifications';
          }
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
