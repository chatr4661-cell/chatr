import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { messaging } from '@/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { toast } from 'sonner';

interface ChatPushNotificationsProps {
  userId: string;
  activeConversationId?: string | null;
}

export const useChatPushNotifications = ({ userId, activeConversationId }: ChatPushNotificationsProps) => {
  useEffect(() => {
    if (!userId || !messaging) return;

    const setupPushNotifications = async () => {
      try {
        // Request permission
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
          console.log('✅ Notification permission granted');
          
          // Get FCM token
          const vapidKey = 'YOUR_VAPID_KEY'; // You'll need to generate this in Firebase Console
          const token = await getToken(messaging, { vapidKey });
          
          if (token) {
            console.log('✅ FCM Token:', token);
            
            // Save token to Firestore users collection
            const firebaseImport = await import('@/firebase');
            const firestoreImport = await import('firebase/firestore');
            const db = firebaseImport.db;
            const docFunc = firestoreImport.doc;
            const setDocFunc = firestoreImport.setDoc;
            
            await setDocFunc(docFunc(db, 'users', userId), {
              fcmToken: token,
              lastUpdated: new Date().toISOString()
            }, { merge: true });
            
            console.log('✅ FCM token saved to Firestore');
          }
        } else {
          console.log('❌ Notification permission denied');
        }
      } catch (error) {
        console.error('Error setting up push notifications:', error);
      }
    };

    setupPushNotifications();

    // Listen for foreground messages
    const unsubscribeMessage = onMessage(messaging, (payload) => {
      console.log('📬 Foreground message received:', payload);
      
      const notificationTitle = payload.notification?.title || 'New message';
      const notificationBody = payload.notification?.body || '';
      
      // Only show notification if not in the active conversation
      const messageConversationId = payload.data?.conversationId;
      if (messageConversationId !== activeConversationId) {
        toast(notificationTitle, {
          description: notificationBody,
          duration: 5000,
        });

        // Show browser notification even when app is open
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

    // Subscribe to new messages in Supabase for push notification triggers
    const messagesChannel = supabase
      .channel('chat-push-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const message = payload.new as any;
          
          // Don't send notification for own messages
          if (message.sender_id === userId) return;
          
          // Only send push for messages not in active conversation
          if (message.conversation_id === activeConversationId) return;
          
          // Get sender details
          const { data: sender } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', message.sender_id)
            .single();
          
          // Send notification using Firebase Cloud Messaging
          // This would typically be done via a cloud function
          // For now, show local notification
          if ('Notification' in window && Notification.permission === 'granted') {
            const senderName = sender?.username || 'Someone';
            
            const notification = new Notification(senderName, {
              body: message.content || 'Sent a message',
              icon: sender?.avatar_url || '/icons/icon-192x192.png',
              badge: '/icons/icon-192x192.png',
              tag: `message-${message.id}`,
              requireInteraction: false,
              data: {
                conversationId: message.conversation_id,
                messageId: message.id,
              },
            });

            // Handle notification click
            notification.onclick = () => {
              window.focus();
              // Navigate to conversation
              window.location.href = `/chat?conversation=${message.conversation_id}`;
              notification.close();
            };
          }
        }
      )
      .subscribe();

    return () => {
      unsubscribeMessage();
      supabase.removeChannel(messagesChannel);
    };
  }, [userId, activeConversationId]);
};
