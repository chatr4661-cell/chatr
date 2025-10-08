import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { toast } from 'sonner';

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
        await PushNotifications.addListener('registration', (token) => {
          console.log('Push registration success, token:', token.value);
          // TODO: Send token to backend to store for this user
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
