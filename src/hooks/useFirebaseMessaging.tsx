import { useEffect, useState } from "react";
import { messaging } from "@/firebase";
import { getToken, onMessage } from "firebase/messaging";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || "";

export const useFirebaseMessaging = (userId?: string) => {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const { toast } = useToast();

  useEffect(() => {
    if (!messaging || !userId) {
      console.log("Firebase Messaging is not supported or no user ID");
      return;
    }

    // Only run on web platform
    if (Capacitor.isNativePlatform()) {
      console.log("Native platform detected, skipping FCM web setup");
      return;
    }

    // Request notification permission
    const requestPermission = async () => {
      try {
        // Check if Notification API is available
        if (typeof Notification === 'undefined') {
          console.log("Notification API not available");
          return;
        }
        
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);

        if (permission === "granted") {
          // Get FCM token
          const token = await getToken(messaging, {
            vapidKey: VAPID_KEY,
          });
          
          if (token) {
            setFcmToken(token);
            console.log("✅ FCM Token obtained:", token.substring(0, 20) + "...");
            
            // Save token to Supabase
            const { error } = await supabase
              .from('device_tokens')
              .upsert({
                user_id: userId,
                device_token: token,
                platform: 'web',
                device_info: {
                  userAgent: navigator.userAgent,
                  timestamp: new Date().toISOString()
                },
                last_used_at: new Date().toISOString()
              }, {
                onConflict: 'user_id,device_token'
              });

            if (error) {
              console.error("Error saving FCM token:", error);
            } else {
              console.log("✅ FCM token saved to database");
            }
          }
        }
      } catch (error) {
        console.error("Error getting FCM token:", error);
      }
    };

    requestPermission();

    // Handle foreground messages
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("📬 Foreground message received:", payload);

      // Backend sends DATA-ONLY messages — read data first, then notification block.
      const d = (payload.data || {}) as Record<string, string>;
      const title = payload.notification?.title || d.title || d.sender_name || "Chatr+";
      const body =
        payload.notification?.body || d.body || d.message || d.content || "You have a new notification";

      toast({
        title,
        description: body,
      });

      // Show browser notification
      if (typeof Notification !== 'undefined' && Notification.permission === "granted") {
        new Notification(title, {
          body,
          icon: d.sender_avatar || "/icons/chatr-logo-192.png",
          badge: "/icons/chatr-logo-192.png",
          tag: d.conversation_id || 'chatr-notification',
          requireInteraction: true,
          data: payload.data
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [toast, userId]);

  return {
    fcmToken,
    notificationPermission,
  };
};
