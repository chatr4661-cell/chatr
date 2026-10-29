import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getMessagingInstance } from '@/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { toast } from 'sonner';

interface ChatPushNotificationsProps {
  userId: string;
  activeConversationId?: string | null;
}

export const useChatPushNotifications = ({ userId, activeConversationId }: ChatPushNotificationsProps) => {
  useEffect(() => {
    if (!userId || typeof window === 'undefined' || !('Notification' in window)) return;

    let isMounted = true;
    let unsubscribeMessage: (() => void) | null = null;

    const setupPushNotifications = async () => {
      try {
        if (Notification.permission !== 'granted') return;

        const msgInstance = await getMessagingInstance();
        if (!msgInstance) return;

        const rawVapid = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';
        const validVapid = rawVapid && rawVapid !== 'YOUR_VAPID_KEY' && !rawVapid.includes('your_vapid')
          ? rawVapid
          : undefined;

        let token: string | null = null;
        try {
          token = await getToken(msgInstance, validVapid ? { vapidKey: validVapid } : undefined);
        } catch (tokenErr) {
          // Gracefully ignore 401 or registration errors so console stays clean
          console.warn('[ChatPush] Web push token unavailable (FCM registration inactive):', tokenErr);
        }

        if (token && isMounted) {
          console.log('✅ [ChatPush] FCM Web Token registered');
        }

        // Listen for foreground messages
        unsubscribeMessage = onMessage(msgInstance, (payload) => {
          if (!isMounted) return;
          console.log('📬 Foreground message received:', payload);
          
          const notificationTitle = payload.notification?.title || 'New message';
          const notificationBody = payload.notification?.body || '';
          
          const messageConversationId = payload.data?.conversationId;
          if (messageConversationId !== activeConversationId) {
            toast(notificationTitle, {
              description: notificationBody,
              duration: 5000,
            });

            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(notificationTitle, {
                body: notificationBody,
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-192x192.png',
                tag: 'chatr-message',
                data: payload.data,
              });
            }
          }
        });
      } catch (error) {
        console.warn('[ChatPush] Setup warning:', error);
      }
    };

    setupPushNotifications();

    return () => {
      isMounted = false;
      if (unsubscribeMessage) unsubscribeMessage();
    };
  }, [userId, activeConversationId]);
};
