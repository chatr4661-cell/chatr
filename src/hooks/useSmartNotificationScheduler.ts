import { useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type WellnessCategory =
  | 'call'
  | 'water'
  | 'food'
  | 'walk'
  | 'sleep'
  | 'mental'
  | 'detox'
  | 'doctor'
  | 'message';

export interface SmartNotificationItem {
  id: string;
  category: WellnessCategory;
  title: string;
  body: string;
  actionUrl: string;
}

const STORAGE_KEYS = {
  LAST_WATER: 'chatr_last_water_nudge',
  LAST_WALK: 'chatr_last_walk_nudge',
  LAST_SLEEP: 'chatr_last_sleep_nudge',
  LAST_MENTAL: 'chatr_last_mental_nudge',
  LAST_DETOX: 'chatr_last_detox_nudge',
  LAST_BREAKFAST: 'chatr_last_breakfast_nudge',
  LAST_LUNCH: 'chatr_last_lunch_nudge',
  LAST_DINNER: 'chatr_last_dinner_nudge',
  LAST_DOCTOR_CHECK: 'chatr_last_doctor_check',
};

/**
 * Triggers a native system notification via @capacitor/local-notifications (on mobile)
 * or active Service Worker (on desktop/web PWA), AND an in-app visual toast if the window is open.
 */
export async function triggerNativePushNotification(options: {
  title: string;
  body: string;
  tag?: string;
  actionUrl?: string;
  delayMs?: number;
  category?: WellnessCategory;
}): Promise<boolean> {
  const {
    title,
    body,
    tag = 'chatr-smart-alert',
    actionUrl = '/',
    delayMs = 0,
    category = 'water',
  } = options;

  if (typeof window === 'undefined') return false;

  // 1. If running on native Android / iOS, schedule directly through OS AlarmManager/UNUserNotificationCenter
  if (Capacitor.isNativePlatform()) {
    try {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        await LocalNotifications.requestPermissions();
      }

      const numericId = Math.abs(tag.split('').reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)) % 2147483647;

      await LocalNotifications.schedule({
        notifications: [
          {
            id: numericId || (Date.now() % 2147483647),
            title,
            body,
            schedule: delayMs > 0 ? { at: new Date(Date.now() + delayMs), allowWhileIdle: true } : undefined,
            sound: 'notification.mp3',
            extra: { actionUrl, category, tag },
            channelId: category === 'call' ? 'calls' : 'messages',
            smallIcon: 'ic_chatr_logo',
            iconColor: '#6200ee',
          },
        ],
      });
      return true;
    } catch (nativeErr) {
      console.warn('Native LocalNotifications schedule error, falling back to web SW:', nativeErr);
    }
  }

  // 1. If delay is requested and window is active, schedule an in-app trigger
  if (delayMs > 0) {
    setTimeout(() => {
      // In-app visual pop-up alert
      if (category === 'call') {
        window.dispatchEvent(
          new CustomEvent('chatr:trigger-incoming-call', {
            detail: {
              id: tag,
              callerName: 'Chatr Test Incoming Call',
              call_type: 'video',
            },
          })
        );
      } else {
        toast(title, {
          description: body,
          action: {
            label: 'View',
            onClick: () => {
              if (actionUrl.startsWith('/')) window.location.href = actionUrl;
            },
          },
          duration: 8000,
        });
      }
    }, delayMs);
  }

  // 2. Request browser permission if needed
  if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
    try {
      const res = await Notification.requestPermission();
      if (res !== 'granted') {
        console.warn('Notification permission not granted:', res);
      }
    } catch (e) {
      console.warn('Could not request notification permission:', e);
    }
  }

  // 3. Hand off to background Service Worker (persists if window is closed/minimized)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sw = reg.active || navigator.serviceWorker.controller;

      if (delayMs > 0 && sw) {
        sw.postMessage({
          type: 'SCHEDULE_TEST_CALL',
          delayMs,
          callData: {
            title,
            body,
            callerName: title,
            callId: tag,
            action_url: actionUrl,
            category,
            type: category === 'call' ? 'call' : 'notification',
          },
        });
        return true;
      }

      await reg.showNotification(title, {
        body,
        icon: '/chatr-logo.png',
        badge: '/chatr-logo.png',
        tag,
        renotify: true,
        requireInteraction: true,
        data: { action_url: actionUrl, category },
        actions: [
          { action: 'open', title: 'Open' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      } as any);

      return true;
    } catch (swErr) {
      console.warn('Service Worker showNotification error:', swErr);
    }
  }

  // 4. Fallback: window Notification
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/chatr-logo.png',
        tag,
      });
      return true;
    } catch (e) {
      console.warn('Window Notification error:', e);
    }
  }

  return false;
}

export function useSmartNotificationScheduler(userId?: string) {
  // Automated routine: Walking, Sleeping, Mental Health, Less Phone, Food, Water
  const runSmartCheck = useCallback(async () => {
    if (!userId || typeof window === 'undefined') return;

    const now = new Date();
    const hour = (now.getUTCHours() + 5 + Math.floor((now.getUTCMinutes() + 30) / 60)) % 24; // IST
    const todayStr = now.toISOString().slice(0, 10);

    // 1. 🚶 WALKING & MOVEMENT (Encouraged at 08:00, 12:00, 16:30, 18:30)
    if ([8, 12, 16, 18].includes(hour)) {
      const lastWalk = localStorage.getItem(STORAGE_KEYS.LAST_WALK);
      const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000;

      if (!lastWalk || parseInt(lastWalk, 10) < fourHoursAgo) {
        const walkTips = [
          '🚶 5-Minute Walk: Stand up and walk! A 5-minute movement break boosts creativity, heart health, and blood flow.',
          '🚶 Daily Step Goal: Step outside for a short, refreshing walk. Fresh air resets mental fatigue.',
          '🚶 Move Your Body: Sitting for long stretches strains your spine. Take a walk around the room now.',
        ];
        const tip = walkTips[Math.floor(Math.random() * walkTips.length)];

        await triggerNativePushNotification({
          title: '🚶 Chatr+ Movement Break',
          body: tip,
          tag: 'nudge-walk',
          actionUrl: '/home',
          category: 'walk',
        });
        localStorage.setItem(STORAGE_KEYS.LAST_WALK, Date.now().toString());
      }
    }

    // 2. 📵 DIGITAL DETOX / LESS PHONE USE (Encouraged at 11:30, 15:00, 17:30)
    if ([11, 15, 17].includes(hour)) {
      const lastDetox = localStorage.getItem(STORAGE_KEYS.LAST_DETOX);
      const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000;

      if (!lastDetox || parseInt(lastDetox, 10) < fourHoursAgo) {
        const detoxTips = [
          '📵 20-20-20 Eye Break: Look away from screens at an object 20 feet away for 20 seconds to protect your eyes.',
          '📵 Phone-Free 15 Minutes: Put your phone face-down for 15 minutes. Reconnect with what is around you.',
          '📵 Screen Rest: Lower screen time to reduce brain fatigue and boost clarity. Give your eyes a rest.',
        ];
        const tip = detoxTips[Math.floor(Math.random() * detoxTips.length)];

        await triggerNativePushNotification({
          title: '📵 Chatr+ Screen Rest Reminder',
          body: tip,
          tag: 'nudge-detox',
          actionUrl: '/home',
          category: 'detox',
        });
        localStorage.setItem(STORAGE_KEYS.LAST_DETOX, Date.now().toString());
      }
    }

    // 3. 🧠 MENTAL HEALTH & MINDFULNESS (Encouraged at 10:30, 14:00, 19:30)
    if ([10, 14, 19].includes(hour)) {
      const lastMental = localStorage.getItem(STORAGE_KEYS.LAST_MENTAL);
      const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000;

      if (!lastMental || parseInt(lastMental, 10) < fourHoursAgo) {
        const mentalTips = [
          '🧠 Mindful Breathing: Inhale for 4s, hold for 4s, exhale for 6s. Let your shoulders drop and relax.',
          '🧠 Emotional Reset: How are you feeling today? Tap to take a quick 1-minute mental health check-in.',
          '🧠 Calm Your Mind: Unclamp your jaw, relax your eyebrows, and take 3 deep, grounding breaths.',
        ];
        const tip = mentalTips[Math.floor(Math.random() * mentalTips.length)];

        await triggerNativePushNotification({
          title: '🧠 Chatr+ Mental Wellness',
          body: tip,
          tag: 'nudge-mental',
          actionUrl: '/mental-health',
          category: 'mental',
        });
        localStorage.setItem(STORAGE_KEYS.LAST_MENTAL, Date.now().toString());
      }
    }

    // 4. 😴 SLEEP & WIND-DOWN (Encouraged at 21:30 - 23:30)
    if (hour >= 21 && hour <= 23) {
      const lastSleep = localStorage.getItem(STORAGE_KEYS.LAST_SLEEP);
      if (lastSleep !== todayStr) {
        const sleepTips = [
          '😴 Sleep Wind-Down: Put your phone away 30 minutes before sleep for deeper, restorative rest tonight.',
          '🌙 Night Rest: Dim your lights and step away from bright screens to encourage natural melatonin production.',
          '😴 Rest Well: Place your phone across the room tonight. Your mind deserves uninterrupted recovery.',
        ];
        const tip = sleepTips[Math.floor(Math.random() * sleepTips.length)];

        await triggerNativePushNotification({
          title: '😴 Chatr+ Sleep Hygiene',
          body: tip,
          tag: 'nudge-sleep',
          actionUrl: '/home',
          category: 'sleep',
        });
        localStorage.setItem(STORAGE_KEYS.LAST_SLEEP, todayStr);
      }
    }

    // 5. 💧 WATER / HYDRATION (Every 3 hours between 9 AM and 9 PM)
    if (hour >= 9 && hour <= 21) {
      const lastWater = localStorage.getItem(STORAGE_KEYS.LAST_WATER);
      const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;

      if (!lastWater || parseInt(lastWater, 10) < threeHoursAgo) {
        await triggerNativePushNotification({
          title: '💧 Chatr+ Hydration Reminder',
          body: 'Drink a glass of water! Consistent hydration fuels brain speed, energy, and clear skin.',
          tag: 'nudge-water',
          actionUrl: '/home',
          category: 'water',
        });
        localStorage.setItem(STORAGE_KEYS.LAST_WATER, Date.now().toString());
      }
    }

    // 6. 🥗 MEAL REMINDERS (Breakfast, Lunch, Dinner)
    if (hour >= 8 && hour < 10) {
      const lastBreakfast = localStorage.getItem(STORAGE_KEYS.LAST_BREAKFAST);
      if (lastBreakfast !== todayStr) {
        await triggerNativePushNotification({
          title: '🍳 Breakfast Time',
          body: 'Fuel your day! Take time to enjoy a nourishing, energizing breakfast.',
          tag: 'nudge-breakfast',
          actionUrl: '/home',
          category: 'food',
        });
        localStorage.setItem(STORAGE_KEYS.LAST_BREAKFAST, todayStr);
      }
    } else if (hour >= 13 && hour < 15) {
      const lastLunch = localStorage.getItem(STORAGE_KEYS.LAST_LUNCH);
      if (lastLunch !== todayStr) {
        await triggerNativePushNotification({
          title: '🥗 Lunch Break Reminder',
          body: 'Step away from your screen, nourish your body, and take a restful pause.',
          tag: 'nudge-lunch',
          actionUrl: '/home',
          category: 'food',
        });
        localStorage.setItem(STORAGE_KEYS.LAST_LUNCH, todayStr);
      }
    } else if (hour >= 20 && hour < 22) {
      const lastDinner = localStorage.getItem(STORAGE_KEYS.LAST_DINNER);
      if (lastDinner !== todayStr) {
        await triggerNativePushNotification({
          title: '🍲 Dinner Reminder',
          body: 'Time for dinner. Eat mindfully and prepare your body for peaceful rest.',
          tag: 'nudge-dinner',
          actionUrl: '/home',
          category: 'food',
        });
        localStorage.setItem(STORAGE_KEYS.LAST_DINNER, todayStr);
      }
    }

    // 7. 🩺 DOCTOR CONSULTATIONS (Next 60 minutes)
    try {
      const windowStart = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const windowEnd = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      const { data: appointments } = await supabase
        .from('appointments')
        .select('id, appointment_date, status, provider_id')
        .eq('patient_id', userId)
        .in('status', ['confirmed', 'scheduled'])
        .gte('appointment_date', windowStart)
        .lte('appointment_date', windowEnd)
        .limit(3);

      if (appointments && appointments.length > 0) {
        for (const appt of appointments) {
          const dedupeKey = `doctor-appt-${appt.id}`;
          if (!localStorage.getItem(dedupeKey)) {
            await triggerNativePushNotification({
              title: '🩺 Upcoming Doctor Consultation',
              body: 'Your doctor appointment is starting soon. Tap to review your details and join.',
              tag: dedupeKey,
              actionUrl: `/appointments/${appt.id}`,
              category: 'doctor',
            });
            localStorage.setItem(dedupeKey, Date.now().toString());
          }
        }
      }
    } catch (apptErr) {
      console.warn('Could not check upcoming appointments:', apptErr);
    }
  }, [userId]);

  // Register persistent native alarms via AlarmManager (Android) & UNUserNotificationCenter (iOS)
  useEffect(() => {
    if (!userId || !Capacitor.isNativePlatform()) return;

    const setupNativeAlarms = async () => {
      try {
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') {
          await LocalNotifications.requestPermissions();
        }

        const ALARMS_VERSION_KEY = 'chatr_native_wellness_alarms_v2';
        if (localStorage.getItem(ALARMS_VERSION_KEY)) return;

        // Ensure Android notification channels exist
        if (Capacitor.getPlatform() === 'android') {
          await LocalNotifications.createChannel({
            id: 'messages',
            name: 'Messages & Wellness',
            description: 'Chatr+ reminders and notifications',
            importance: 4,
            sound: 'notification.mp3',
            vibration: true,
            visibility: 1,
          });
        }

        // Schedule recurring daily alarms that survive force-close / killed state
        await LocalNotifications.schedule({
          notifications: [
            {
              id: 9001,
              title: '🚶 Chatr+ Morning Movement Break',
              body: 'Stand up and step outside! A 5-minute walk resets mental fatigue and fuels your day.',
              schedule: { on: { hour: 8, minute: 0 }, allowWhileIdle: true },
              extra: { actionUrl: '/', category: 'walk' },
              channelId: 'messages',
              sound: 'notification.mp3',
            },
            {
              id: 9002,
              title: '💧 Hydration Check-In',
              body: 'Drink a glass of water! Consistent hydration powers your brain and focus.',
              schedule: { on: { hour: 10, minute: 30 }, allowWhileIdle: true },
              extra: { actionUrl: '/', category: 'water' },
              channelId: 'messages',
              sound: 'notification.mp3',
            },
            {
              id: 9003,
              title: '🥗 Nourishing Lunch & Screen Rest',
              body: 'Step away from your screen, nourish your body, and take a 15-minute pause.',
              schedule: { on: { hour: 12, minute: 45 }, allowWhileIdle: true },
              extra: { actionUrl: '/', category: 'food' },
              channelId: 'messages',
              sound: 'notification.mp3',
            },
            {
              id: 9004,
              title: '📵 20-20-20 Eye Break & Digital Detox',
              body: 'Look at an object 20 feet away for 20 seconds. Give your eyes and mind a rest.',
              schedule: { on: { hour: 15, minute: 0 }, allowWhileIdle: true },
              extra: { actionUrl: '/', category: 'detox' },
              channelId: 'messages',
              sound: 'notification.mp3',
            },
            {
              id: 9005,
              title: '🚶 Afternoon Refresh & Steps Goal',
              body: 'Time for an afternoon walk! A quick walk boosts metabolism and clears brain fog.',
              schedule: { on: { hour: 17, minute: 0 }, allowWhileIdle: true },
              extra: { actionUrl: '/', category: 'walk' },
              channelId: 'messages',
              sound: 'notification.mp3',
            },
            {
              id: 9006,
              title: '🧠 Mindful Breath & Mental Reset',
              body: 'Unclamp your jaw, drop your shoulders, and take 3 deep, grounding breaths.',
              schedule: { on: { hour: 19, minute: 30 }, allowWhileIdle: true },
              extra: { actionUrl: '/mental-health', category: 'mental' },
              channelId: 'messages',
              sound: 'notification.mp3',
            },
            {
              id: 9007,
              title: '😴 Sleep Wind-Down & Night Mode',
              body: 'Place your phone across the room tonight. Give your mind uninterrupted recovery.',
              schedule: { on: { hour: 22, minute: 30 }, allowWhileIdle: true },
              extra: { actionUrl: '/', category: 'sleep' },
              channelId: 'messages',
              sound: 'notification.mp3',
            },
          ],
        });

        localStorage.setItem(ALARMS_VERSION_KEY, 'true');
        console.log('✅ Persistent native wellness alarms registered with OS AlarmManager');
      } catch (err) {
        console.warn('Could not register native wellness alarms:', err);
      }
    };

    setupNativeAlarms();

    // Listen for notification taps to route cleanly
    const listenerPromise = LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      const url = action.notification.extra?.actionUrl;
      if (url && typeof window !== 'undefined') {
        window.location.href = url;
      }
    });

    return () => {
      listenerPromise.then((handle) => handle.remove()).catch(() => {});
    };
  }, [userId]);

  // Run on mount and periodically while app is open / active
  useEffect(() => {
    if (!userId) return;

    const initialTimer = setTimeout(runSmartCheck, 5000);
    const interval = setInterval(runSmartCheck, 15 * 60 * 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [userId, runSmartCheck]);

  // Manual trigger for user instant testing (with both in-app popup and background push)
  const triggerTest = useCallback(
    async (category: WellnessCategory, delaySeconds = 5) => {
      const templates: Record<
        WellnessCategory,
        { title: string; body: string; actionUrl: string }
      > = {
        call: {
          title: '📞 Incoming Call from ARSHID',
          body: 'Chatr+ Video Call ringing... Tap to Answer or Decline.',
          actionUrl: '/calls',
        },
        walk: {
          title: '🚶 5-Minute Walking Break',
          body: 'Time to stand up! A brisk 5-minute walk boosts energy and clears your mind.',
          actionUrl: '/home',
        },
        sleep: {
          title: '😴 Sleep Wind-Down & Night Mode',
          body: 'Lower screen brightness and put your phone across the room for deeper rest.',
          actionUrl: '/home',
        },
        mental: {
          title: '🧠 Mindful Breath & Mental Reset',
          body: 'Take 3 deep breaths. Inhale 4s, hold 4s, exhale 6s. Your mental health matters.',
          actionUrl: '/mental-health',
        },
        detox: {
          title: '📵 Screen Break (20-20-20 Rule)',
          body: 'Look away from your screen at an object 20 feet away for 20 seconds. Rest your eyes.',
          actionUrl: '/home',
        },
        water: {
          title: '💧 Hydration Check',
          body: 'Drink a glass of water! Staying hydrated keeps your energy and brain peak.',
          actionUrl: '/home',
        },
        food: {
          title: '🥗 Meal & Nutrition Break',
          body: 'Time for a nourishing meal! Pause your work and enjoy healthy food.',
          actionUrl: '/home',
        },
        doctor: {
          title: '🩺 Doctor Consultation in 30 Mins',
          body: 'Reminder: Healthcare consultation scheduled for 2:30 PM. Tap to prepare.',
          actionUrl: '/appointments',
        },
        message: {
          title: '💬 New Message from Doctor / Team',
          body: 'Hello! Your health report and follow-up notes are ready for review.',
          actionUrl: '/chat',
        },
      };

      const selected = templates[category];
      toast.info(`⏱️ ${selected.title} scheduled in ${delaySeconds}s! Close or minimize to test background, or stay here to see the pop-up.`, {
        duration: 5000,
      });

      return await triggerNativePushNotification({
        title: selected.title,
        body: selected.body,
        tag: `test-${category}-${Date.now()}`,
        actionUrl: selected.actionUrl,
        delayMs: delaySeconds * 1000,
        category,
      });
    },
    []
  );

  return { triggerTest, runSmartCheck };
}
