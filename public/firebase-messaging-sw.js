// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.13.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.1/firebase-messaging-compat.js');

// Initialize Firebase in service worker
firebase.initializeApp({
  apiKey: "AIzaSyDUUbQlOmkHsrEyMw9AmQBXbjNx11iM7w4",
  authDomain: "chatr-91067.firebaseapp.com",
  projectId: "chatr-91067",
  storageBucket: "chatr-91067.firebasestorage.app",
  messagingSenderId: "839345688435",
  appId: "1:839345688435:android:17283f3299c22c1c233f06"
});

const messaging = firebase.messaging();

// Handle background messages (when app is closed or in background)
messaging.onBackgroundMessage((payload) => {
  console.log('📬 Background message received:', payload);
  
  const notificationTitle = payload.notification?.title || 'New message';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: 'chatr-message',
    requireInteraction: true, // Keep notification visible
    vibrate: [200, 100, 200], // Vibration pattern
    data: payload.data,
    actions: [
      {
        action: 'open',
        title: 'Open Chat'
      },
      {
        action: 'reply',
        title: 'Reply'
      }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click (when app is closed)
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event.action);
  event.notification.close();
  
  const data = event.notification.data || {};
  const conversationId = data.conversationId || data.conversation_id;
  const messageId = data.messageId || data.message_id;

  // Smart deep-link routing — mirrors src/utils/notificationRouter.ts
  function resolveRoute(d) {
    if (d.action_url && typeof d.action_url === 'string' && d.action_url.startsWith('/')) {
      return d.action_url;
    }
    const t = (d.type || d.category || '').toLowerCase();
    switch (t) {
      case 'call':
      case 'missed':
      case 'missed_call':
        return d.caller_id ? `/chat?user=${d.caller_id}` : '/calls';
      case 'message':
      case 'chat':
      case 'unread_msgs':
        if (d.conversation_id || d.conversationId) return `/chat?conversation=${d.conversation_id || d.conversationId}`;
        if (d.sender_id) return `/chat?user=${d.sender_id}`;
        return '/chat';
      case 'appointment':
      case 'booking':
      case 'calendar':
        return d.appointment_id ? `/appointments/${d.appointment_id}` : '/appointments';
      case 'earning':
      case 'mission':
        return d.mission_id ? `/earn?mission=${d.mission_id}` : '/earn';
      case 'wellness':
      case 'lifestyle':
        return d.route || '/home';
      case 'payment':
      case 'wallet':
        return '/wallet';
      default:
        return d.route || '/notifications';
    }
  }

  let urlToOpen = resolveRoute(data);
  if (event.action === 'reply' && urlToOpen.includes('/chat')) {
    urlToOpen += (urlToOpen.includes('?') ? '&' : '?') + 'reply=true';
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if ('focus' in client) {
            client.focus();
            client.postMessage({
              type: 'NAVIGATE_TO_NOTIFICATION',
              url: urlToOpen,
              conversationId: conversationId,
              messageId: messageId,
              data: data,
            });
            return;
          }
        }
        
        // No window found, open new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
