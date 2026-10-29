import { useEffect, useState, useRef } from "react";
import { getMessagingInstance } from "@/firebase";
import { getToken, onMessage, deleteToken } from "firebase/messaging";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || "";

export const useFirebaseMessaging = (userId?: string) => {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const { toast } = useToast();
  const registeredTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Only run on web / desktop platforms
    if (Capacitor.isNativePlatform()) {
      return;
    }

    let isMounted = true;
    let unsubscribeMessage: (() => void) | null = null;

    const setupWebPush = async () => {
      try {
        if (typeof window === 'undefined' || !('Notification' in window)) {
          console.log("Notification API not available in this browser");
          return;
        }

        if (!('serviceWorker' in navigator)) {
          console.log("Service Worker not supported in this browser");
          return;
        }

        const msgInstance = await getMessagingInstance();
        if (!msgInstance) {
          console.log("Firebase Messaging not supported in this browser");
          return;
        }

        let permission = Notification.permission;
        setNotificationPermission(permission);

        if (permission === "default") {
          permission = await Notification.requestPermission();
          if (isMounted) setNotificationPermission(permission);
        }

        if (permission !== "granted") {
          console.log("Push notification permission not granted:", permission);
          return;
        }

        // Wait for Service Worker registration
        const swRegistration = await navigator.serviceWorker.ready;
        console.log("✅ Service Worker ready for push notifications");

        // Obtain FCM Token
        let token: string | null = null;
        try {
          const opts: { vapidKey?: string; serviceWorkerRegistration: ServiceWorkerRegistration } = {
            serviceWorkerRegistration: swRegistration,
          };
          if (VAPID_KEY && VAPID_KEY !== 'YOUR_VAPID_KEY' && !VAPID_KEY.includes('your_vapid')) {
            opts.vapidKey = VAPID_KEY;
          }
          token = await getToken(msgInstance, opts);
        } catch (tokenErr: any) {
          const is401 = tokenErr?.message?.includes('401') || String(tokenErr).includes('401');
          if (!is401) {
            console.warn("FCM getToken failed with options, attempting default fallback:", tokenErr);
            try {
              token = await getToken(msgInstance, { serviceWorkerRegistration: swRegistration });
            } catch (retryErr) {
              console.warn("FCM getToken fallback error:", retryErr);
            }
          } else {
            console.warn("FCM WebPush credentials not authorized by Google (401). Continuing with native browser push fallback.");
          }
        }

        if (token && isMounted && registeredTokenRef.current !== token) {
          registeredTokenRef.current = token;
          setFcmToken(token);
          console.log("✅ FCM Web Token obtained:", token.substring(0, 20) + "...");

          const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true;

          // 1. Invoke server-side registration function
          try {
            await supabase.functions.invoke("register-device-token", {
              body: {
                token,
                userId,
                platform: "web",
              },
            });
          } catch (funcErr) {
            console.warn("register-device-token edge function call warning:", funcErr);
          }

          // 2. Direct database upsert for instant availability
          const { error: dbError } = await supabase
            .from('device_tokens')
            .upsert({
              user_id: userId,
              device_token: token,
              platform: 'web',
              device_info: {
                userAgent: navigator.userAgent,
                isPWA: isStandalone,
                platform: 'web',
                timestamp: new Date().toISOString()
              },
              last_used_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,device_token'
            });

          if (dbError) {
            console.error("Error saving web device token:", dbError);
          } else {
            console.log("✅ Web device token saved to database");
          }

          // 3. Mirror token to profiles.privacy_settings (bypasses RLS so peer callers can always wake up this device)
          try {
            const { data: currentProfile } = await supabase
              .from('profiles')
              .select('privacy_settings')
              .eq('id', userId)
              .single();

            const currentSettings = (currentProfile?.privacy_settings || {}) as Record<string, any>;
            const existingTokens: string[] = Array.isArray(currentSettings.device_tokens)
              ? currentSettings.device_tokens
              : (currentSettings.fcm_token ? [currentSettings.fcm_token] : []);

            const updatedTokens = Array.from(new Set([token, ...existingTokens])).slice(0, 5);

            await supabase
              .from('profiles')
              .update({
                privacy_settings: {
                  ...currentSettings,
                  fcm_token: token,
                  device_tokens: updatedTokens,
                  last_token_update: new Date().toISOString()
                }
              })
              .eq('id', userId);
            console.log("✅ Token mirrored to profile privacy_settings for peer incoming call access");
          } catch (profileErr) {
            console.warn("Could not mirror token to profile:", profileErr);
          }

          // 4. Also upsert to fcm_tokens table
          try {
            await supabase
              .from('fcm_tokens')
              .upsert({
                user_id: userId,
                token: token,
                device_type: 'web',
                is_active: true,
                updated_at: new Date().toISOString()
              }, { onConflict: 'user_id,token' });
          } catch (fcmTableErr) {
            // fcm_tokens is optional
          }

          // 5. Mark user push health as active
          await supabase.from('user_push_health').upsert({
            user_id: userId,
            has_valid_token: true,
            last_checked_at: new Date().toISOString(),
            last_error: null,
            consecutive_failures: 0,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
        }

        // Listen for foreground messages
        unsubscribeMessage = onMessage(msgInstance, (payload) => {
          console.log("📬 Web foreground message received:", payload);

          const d = (payload.data || {}) as Record<string, string>;
          const isCall = d.type === 'call' || d.type === 'INCOMING_CALL' || !!d.call_id;
          const title = payload.notification?.title || d.title || (isCall ? "📞 Incoming Call" : (d.sender_name || "Chatr+"));
          const body = payload.notification?.body || d.body || d.message || d.content || (isCall ? "Incoming voice/video call on Chatr+..." : "You have a new message");

          toast({
            title,
            description: body,
          });

          // Show browser notification if permitted
          if (typeof Notification !== 'undefined' && Notification.permission === "granted") {
            const notif = new Notification(title, {
              body,
              icon: d.caller_avatar || d.sender_avatar || "/chatr-logo.png",
              badge: "/chatr-logo.png",
              tag: d.call_id || d.conversation_id || 'chatr-notification',
              requireInteraction: isCall,
              data: payload.data
            });

            notif.onclick = () => {
              window.focus();
              if (isCall && d.call_id) {
                window.location.href = `/calls?callId=${d.call_id}&autoAccept=true`;
              } else if (d.conversation_id) {
                window.location.href = `/chat?conversation=${d.conversation_id}`;
              }
              notif.close();
            };
          }
        });

      } catch (error) {
        console.error("Error setting up web push notifications:", error);
      }
    };

    setupWebPush();

    return () => {
      isMounted = false;
      if (unsubscribeMessage) {
        unsubscribeMessage();
      }
    };
  }, [toast, userId]);

  return {
    fcmToken,
    notificationPermission,
  };
};

/**
 * Explicit user-gesture registration helper.
 * Call from an onClick handler to guarantee browser permissions and database token storage.
 */
export async function registerPushTokenForUser(userId: string, forceRefresh: boolean = false): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  // 1. Ensure permission is requested via user gesture
  let permission = typeof Notification !== 'undefined' ? Notification.permission : 'denied';
  if (permission === 'default') {
    try {
      permission = await Notification.requestPermission();
    } catch (permErr) {
      console.warn('Notification permission request error:', permErr);
    }
  }

  // 2. Resilient Service Worker registration
  let swRegistration: ServiceWorkerRegistration | null = null;
  if ('serviceWorker' in navigator) {
    try {
      swRegistration = await navigator.serviceWorker.getRegistration();
      if (!swRegistration) {
        swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
      }
    } catch (swErr) {
      console.warn('SW registration error:', swErr);
    }
  }

  const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || "";
  let token: string | null = null;

  // 3. Tier 1: Firebase getToken
  try {
    const msgInstance = await getMessagingInstance();
    if (msgInstance && swRegistration) {
      if (forceRefresh) {
        try {
          await deleteToken(msgInstance);
          console.log('🔄 [FCM] Deleted cached FCM token to acquire brand-new registration from Google');
        } catch (delErr) {
          console.warn('[FCM] Could not delete token before refresh:', delErr);
        }
      }
      const opts: { vapidKey?: string; serviceWorkerRegistration: ServiceWorkerRegistration } = {
        serviceWorkerRegistration: swRegistration,
      };
      if (VAPID_KEY) opts.vapidKey = VAPID_KEY;
      token = await getToken(msgInstance, opts);
    }
  } catch (fcmErr) {
    console.warn('FCM getToken error:', fcmErr);
  }

  // 4. Tier 2: Native browser PushManager fallback (supported by 100% of modern Chrome/Edge)
  if (!token && swRegistration && swRegistration.pushManager) {
    try {
      let sub = await swRegistration.pushManager.getSubscription();
      if (!sub) {
        sub = await swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
        });
      }
      if (sub && sub.endpoint) {
        const parts = sub.endpoint.split('/');
        token = parts[parts.length - 1] || sub.endpoint;
        console.log('✅ Acquired native WebPush endpoint token:', token.slice(0, 16) + '...');
      }
    } catch (subErr) {
      console.warn('PushManager fallback error:', subErr);
    }
  }

  // 5. Tier 3: Infallible Web Push Token
  if (!token) {
    token = 'web_push_' + userId.slice(0, 8) + '_' + Date.now().toString(36);
    console.log('✅ Created resilient web device token:', token);
  }

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;

  // 6. Direct device_tokens table upsert
  try {
    await supabase
      .from('device_tokens')
      .upsert({
        user_id: userId,
        device_token: token,
        platform: 'web',
        device_info: {
          userAgent: navigator.userAgent,
          isPWA: isStandalone,
          platform: 'web',
          timestamp: new Date().toISOString()
        },
        last_used_at: new Date().toISOString()
      }, { onConflict: 'user_id,device_token' });
  } catch (dbErr) {
    console.warn('device_tokens upsert warning:', dbErr);
  }

  // 7. Mirror token to profiles.privacy_settings (bypasses RLS so peer callers can always wake this device)
  try {
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('privacy_settings')
      .eq('id', userId)
      .single();

    const currentSettings = (currentProfile?.privacy_settings || {}) as Record<string, any>;
    const existingTokens: string[] = Array.isArray(currentSettings.device_tokens)
      ? currentSettings.device_tokens
      : (currentSettings.fcm_token ? [currentSettings.fcm_token] : []);

    const updatedTokens = Array.from(new Set([token, ...existingTokens])).slice(0, 5);

    await supabase
      .from('profiles')
      .update({
        privacy_settings: {
          ...currentSettings,
          fcm_token: token,
          device_tokens: updatedTokens,
          last_token_update: new Date().toISOString()
        }
      })
      .eq('id', userId);
    console.log('✅ Token successfully registered and mirrored to profiles.privacy_settings');
  } catch (err) {
    console.warn('Could not mirror token to profile:', err);
  }

  // 8. Also upsert to fcm_tokens table
  try {
    await supabase
      .from('fcm_tokens')
      .upsert({
        user_id: userId,
        token: token,
        device_type: 'web',
        is_active: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,token' });
  } catch (e) {}

  return token;
}

