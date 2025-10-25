import { useEffect, useState } from "react";
import { messaging } from "@/firebase";
import { getToken, onMessage } from "firebase/messaging";
import { useToast } from "@/hooks/use-toast";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || "";

export const useFirebaseMessaging = () => {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const { toast } = useToast();

  useEffect(() => {
    if (!messaging) {
      console.log("Firebase Messaging is not supported");
      return;
    }

    // Request notification permission
    const requestPermission = async () => {
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);

        if (permission === "granted") {
          // Get FCM token
          const token = await getToken(messaging, {
            vapidKey: VAPID_KEY,
          });
          
          if (token) {
            setFcmToken(token);
            console.log("FCM Token:", token);
            
            // TODO: Save token to Firestore under /users/{uid}/tokens
          }
        }
      } catch (error) {
        console.error("Error getting FCM token:", error);
      }
    };

    requestPermission();

    // Handle foreground messages
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("Foreground message received:", payload);
      
      toast({
        title: payload.notification?.title || "New message",
        description: payload.notification?.body || "You have a new message",
      });

      // Show browser notification
      if (Notification.permission === "granted") {
        new Notification(payload.notification?.title || "New message", {
          body: payload.notification?.body,
          icon: "/icons/icon-192x192.png",
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [toast]);

  return {
    fcmToken,
    notificationPermission,
  };
};
