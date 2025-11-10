/**
 * Service Worker Registration Utility
 * Handles registration of service workers for push notifications
 * Works even when app is closed or in background
 */

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) {
    console.log('❌ Service Worker not supported');
    return null;
  }

  try {
    // Register the Firebase messaging service worker
    const registration = await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js',
      { scope: '/' }
    );

    console.log('✅ Service Worker registered:', registration);

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;
    console.log('✅ Service Worker ready');

    // Check for updates periodically
    setInterval(() => {
      registration.update();
    }, 60000); // Check every minute

    return registration;
  } catch (error) {
    console.error('❌ Service Worker registration failed:', error);
    return null;
  }
};

export const unregisterServiceWorker = async (): Promise<boolean> => {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const success = await registration.unregister();
      console.log('✅ Service Worker unregistered:', success);
      return success;
    }
    return false;
  } catch (error) {
    console.error('❌ Service Worker unregister failed:', error);
    return false;
  }
};

export const checkServiceWorkerStatus = async (): Promise<{
  registered: boolean;
  active: boolean;
  controller: boolean;
}> => {
  if (!('serviceWorker' in navigator)) {
    return { registered: false, active: false, controller: false };
  }

  const registration = await navigator.serviceWorker.getRegistration();
  
  return {
    registered: !!registration,
    active: !!registration?.active,
    controller: !!navigator.serviceWorker.controller
  };
};

/**
 * Request notification permission
 * Required for push notifications
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    console.log('❌ Notifications not supported');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('🔔 Notification permission:', permission);
    return permission;
  } catch (error) {
    console.error('❌ Notification permission request failed:', error);
    return 'denied';
  }
};

/**
 * Show a test notification
 */
export const showTestNotification = async (title: string, body: string): Promise<void> => {
  if (!('serviceWorker' in navigator) || typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    console.log('❌ Cannot show notification');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: 'test-notification',
      requireInteraction: false,
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      }
    });
    console.log('✅ Test notification shown');
  } catch (error) {
    console.error('❌ Failed to show test notification:', error);
  }
};
