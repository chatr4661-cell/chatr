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
    // Check if already registered
    const existing = await navigator.serviceWorker.getRegistration('/');
    if (existing) {
      console.log('✅ Service Worker already active');
      // Silently try to update - don't throw if it fails
      existing.update().catch(() => {});
      return existing;
    }

    // Check if sw.js exists before attempting registration
    const swCheck = await fetch('/sw.js', { method: 'HEAD' }).catch(() => null);
    if (!swCheck || !swCheck.ok) {
      console.log('⚠️ Service Worker file not available, skipping registration');
      return null;
    }

    // Register the main service worker (handles both caching and push)
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none'
    });

    console.log('✅ Service Worker registered:', registration);

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;
    console.log('✅ Service Worker ready');

    // Check for updates periodically with error handling
    setInterval(() => {
      registration.update().catch(() => {
        // Silently ignore update errors (transient network issues)
      });
    }, 60000); // Check every minute

    // Listen for messages from service worker (e.g., navigate on notification click)
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('📲 SW Message:', event.data);
      const d = event.data || {};
      // Generic navigate message
      if (d.type === 'NAVIGATE' && d.url) {
        window.location.href = d.url;
        return;
      }
      // Smart-routed notification click from firebase-messaging-sw.js
      if (d.type === 'NAVIGATE_TO_NOTIFICATION' && d.url) {
        window.location.href = d.url;
        return;
      }
      // Legacy chat-only message — kept for backwards compat
      if (d.type === 'NAVIGATE_TO_CONVERSATION' && d.conversationId) {
        window.location.href = `/chat?conversation=${d.conversationId}`;
      }
    });

    return registration;
  } catch (error) {
    // Silently fail - SW is optional
    console.log('⚠️ Service Worker registration skipped:', (error as Error).message);
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
