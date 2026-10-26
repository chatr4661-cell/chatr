// Import Firebase scripts safely
try {
  importScripts('https://www.gstatic.com/firebasejs/10.13.1/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.13.1/firebase-messaging-compat.js');
} catch (e) {
  console.warn('Firebase scripts import warning:', e);
}

// Instant Service Worker activation
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Initialize Firebase in service worker
let messaging = null;
try {
  if (typeof firebase !== 'undefined') {
    firebase.initializeApp({
      apiKey: "AIzaSyAN2OYbpesZFUOAfUt_wycLJOYRvJt9PNA",
      authDomain: "chatr-91067.firebaseapp.com",
      projectId: "chatr-91067",
      storageBucket: "chatr-91067.firebasestorage.app",
      messagingSenderId: "839345688435",
      appId: "1:839345688435:web:3c41f47446e6efc0233f06"
    });
    messaging = firebase.messaging();
  }
} catch (e) {
  console.warn('Firebase SW initialization warning:', e);
}

// Unified push notification dispatcher
function dispatchNotification(payload) {
  let d = payload.data || {};
  if (typeof d === 'string') {
    try { d = JSON.parse(d); } catch (e) {}
  }
  if (!d.type && !d.call_id && !d.callId) {
    if (payload.call_id || payload.callId || payload.type) {
      d = payload;
    }
  }
  const n = payload.notification || {};

  // 1. DEDICATED INCOMING CALL PERSISTENT ALERT (WhatsApp / FaceTime style)
  if (d.type === 'call' || d.type === 'INCOMING_CALL' || d.call_id || d.callId) {
    const isVideo = d.is_video === 'true' || d.isVideo === true || d.call_type === 'video' || d.callType === 'video';
    const callerName = d.caller_name || d.callerName || d.sender_name || 'Someone';
    const callId = d.call_id || d.callId || d.conversation_id;

    const callTitle = `📞 Incoming ${isVideo ? 'Video' : 'Voice'} Call`;
    const callBody = `${callerName} is calling you on Chatr+...`;

    const callOptions = {
      body: callBody,
      icon: d.caller_avatar || d.sender_avatar || '/chatr-logo.png',
      badge: '/chatr-logo.png',
      tag: `incoming-call-${callId}`,
      requireInteraction: true, // Keep notification active on screen until answered or declined
      renotify: true,
      silent: false,
      sound: '/ringtone.mp3',
      vibrate: [500, 200, 500, 200, 500, 200, 500, 200, 500], // Continuous ring vibration
      data: {
        ...d,
        type: 'call',
        call_id: callId,
        callId: callId,
        action_url: `/calls?callId=${callId}&autoAccept=true`
      },
      actions: [
        {
          action: 'accept_call',
          title: '✅ Answer'
        },
        {
          action: 'decline_call',
          title: '❌ Decline'
        }
      ]
    };

    return self.registration.showNotification(callTitle, callOptions);
  }

  // 2. STANDARD CHAT / NOTIFICATION PAYLOAD
  const notificationTitle = n.title || d.title || d.sender_name || 'Chatr+';
  const bodyText = n.body || d.body || d.message || d.content || 'You have a new notification';

  const notificationOptions = {
    body: bodyText,
    icon: d.sender_avatar || '/chatr-logo.png',
    badge: '/chatr-logo.png',
    image: d.image || undefined,
    tag: d.conversation_id || d.tag || 'chatr-message',
    renotify: true,
    requireInteraction: true, // Keep notification visible
    vibrate: [200, 100, 200], // Vibration pattern
    data: { ...d, ...(payload.data || {}) },
    actions: [
      {
        action: 'open',
        title: 'Open'
      },
      {
        action: 'reply',
        title: 'Reply'
      }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
}

// Handle background messages via Firebase SDK
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log('📬 Background message received (Firebase SDK):', payload);
    return dispatchNotification(payload);
  });
}

// Fallback: standard Web Push 'push' event listener
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    try {
      payload = { data: { message: event.data.text() } };
    } catch (err) {}
  }

  const d = payload.data || {};
  const tag = (d.call_id || d.callId) ? `incoming-call-${d.call_id || d.callId}` : (d.conversation_id || null);

  event.waitUntil(
    self.registration.getNotifications(tag ? { tag } : undefined).then((existing) => {
      // Avoid duplicate display if already shown within the last 3 seconds
      if (existing && existing.length > 0) {
        return;
      }
      return dispatchNotification(payload);
    })
  );
});

// Schedule incoming call test from the Service Worker daemon thread (persists even if window is closed)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_TEST_CALL') {
    const delay = event.data.delayMs || 5000;
    const callData = event.data.callData || {};
    console.log(`⏱️ [SW] Background test incoming call scheduled in ${delay}ms`);

    const promise = new Promise((resolve) => {
      setTimeout(async () => {
        try {
          const isCall = callData.type === 'call' || (!callData.title && !callData.body);
          if (isCall) {
            await dispatchNotification({
              data: {
                type: 'call',
                call_id: callData.callId || ('test-' + Date.now()),
                caller_name: callData.callerName || 'Chatr Test (Closed App)',
                is_video: 'true',
                ...callData
              }
            });
          } else {
            await dispatchNotification({
              data: {
                title: callData.title || 'Chatr+ Notification',
                body: callData.body || 'You have an update from Chatr+',
                action_url: callData.action_url || '/notifications',
                ...callData
              }
            });
          }
          console.log('✅ [SW] Background test notification dispatched successfully');
        } catch (err) {
          console.error('❌ [SW] Failed to dispatch test notification:', err);
        } finally {
          resolve();
        }
      }, delay);
    });

    if (event.waitUntil) {
      event.waitUntil(promise);
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event.action);
  event.notification.close();

  // If user declined the call, dismiss and exit immediately
  if (event.action === 'decline_call') {
    return;
  }
  
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
      case 'incoming_call':
        if (d.callId || d.call_id) {
          return `/calls?callId=${d.callId || d.call_id}&autoAccept=true`;
        }
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
            if ('navigate' in client) {
              client.navigate(urlToOpen).catch(() => {});
            }
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
