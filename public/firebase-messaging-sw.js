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
  
  const conversationId = event.notification.data?.conversationId;
  const messageId = event.notification.data?.messageId;
  
  let urlToOpen = '/chat';
  
  // Open specific conversation if available
  if (conversationId) {
    urlToOpen = `/chat?conversation=${conversationId}`;
  }
  
  if (event.action === 'reply') {
    // Handle inline reply action
    urlToOpen += '&reply=true';
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes('/chat') && 'focus' in client) {
            // Focus existing window and navigate to conversation
            client.focus();
            client.postMessage({
              type: 'NAVIGATE_TO_CONVERSATION',
              conversationId: conversationId,
              messageId: messageId
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
