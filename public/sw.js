// Chatr Service Worker - PWABuilder Compliant
// Handles offline functionality, caching, background sync, and push notifications

// Cache version - increment to force update
const CACHE_NAME = 'chatr-cache-v4';
const RUNTIME_CACHE = 'chatr-runtime-v4';
const IMAGE_CACHE = 'chatr-images-v4';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event - cache static assets with error handling
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching static assets');
        // Cache each asset individually to prevent one failure from breaking all
        return Promise.allSettled(
          STATIC_ASSETS.map(url => 
            cache.add(url).catch(err => {
              console.warn('Failed to cache:', url, err.message);
              return null;
            })
          )
        );
      })
      .then(() => self.skipWaiting())
      .catch(err => {
        console.error('Service Worker install failed:', err);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== RUNTIME_CACHE && 
              cacheName !== IMAGE_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests except images
  if (url.origin !== location.origin) {
    if (request.destination === 'image') {
      event.respondWith(
        caches.open(IMAGE_CACHE).then(cache => {
          return cache.match(request).then(response => {
            return response || fetch(request).then(fetchResponse => {
              cache.put(request, fetchResponse.clone());
              return fetchResponse;
            });
          });
        })
      );
    }
    return;
  }

  // NEVER cache JavaScript files to prevent stale code
  if (url.pathname.endsWith('.js') || url.pathname.includes('/src/') || url.pathname.includes('node_modules')) {
    event.respondWith(fetch(request));
    return;
  }

  // Handle API requests (network first with 25s timeout for 2G, cache fallback)
  if (url.pathname.includes('/api/') || url.pathname.includes('supabase')) {
    event.respondWith(
      Promise.race([
        fetch(request),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 25000) // 25s timeout for 2G
        )
      ])
        .then(response => {
          // Clone and cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails or times out
          return caches.match(request).then(cached => {
            if (cached) return cached;
            // Return offline indicator
            return new Response(JSON.stringify({ offline: true }), {
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // Handle images (cache first, network fallback)
  if (request.destination === 'image') {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(cache => {
        return cache.match(request).then(response => {
          return response || fetch(request).then(fetchResponse => {
            cache.put(request, fetchResponse.clone());
            return fetchResponse;
          }).catch(() => {
            // Return placeholder if offline
            return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="#ccc" width="200" height="200"/></svg>', {
              headers: { 'Content-Type': 'image/svg+xml' }
            });
          });
        });
      })
    );
    return;
  }

  // Handle navigation requests (cache first with network update)
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(request)
        .then(response => {
          if (response) {
            // Update cache in background
            fetch(request).then(fetchResponse => {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, fetchResponse);
              });
            }).catch(() => {});
            return response;
          }
          return fetch(request);
        })
        .catch(() => {
          // Offline fallback
          return caches.match('/index.html');
        })
    );
    return;
  }

  // Handle all other requests (cache first, network fallback)
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(request).then(fetchResponse => {
          // Cache successful responses
          if (fetchResponse.status === 200) {
            const responseClone = fetchResponse.clone();
            caches.open(RUNTIME_CACHE).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return fetchResponse;
        });
      })
      .catch(() => {
        if (request.destination === 'document') {
          return caches.match('/index.html');
        }
      })
  );
});

// Background Sync - handle offline messages
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  } else if (event.tag === 'sync-contacts') {
    event.waitUntil(syncContacts());
  }
});

// Periodic Background Sync - check for updates
self.addEventListener('periodicsync', (event) => {
  console.log('Periodic sync triggered:', event.tag);
  
  // Use simple tag name
  if (event.tag === 'sync') {
    event.waitUntil(performDailySync());
  }
});

// Push Notification Handler - Enhanced for Calls and Messages
self.addEventListener('push', (event) => {
  console.log('📲 Push notification received');
  
  let notificationOptions = {
    icon: '/chatr-logo.png',
    badge: '/chatr-logo.png',
    vibrate: [200, 100, 200],
    tag: 'chatr-notification',
    requireInteraction: false,
    data: { url: '/' }
  };

  let title = 'Chatr';

  if (event.data) {
    try {
      const data = event.data.json();
      console.log('📲 Push data:', data);
      
      // Handle INCOMING CALL notifications
      if (data.type === 'call' || data.call_id) {
        title = data.caller_name || 'Incoming Call';
        notificationOptions = {
          ...notificationOptions,
          body: data.call_type === 'video' ? '📹 Incoming Video Call' : '📞 Incoming Voice Call',
          icon: data.caller_avatar || '/chatr-logo.png',
          tag: 'chatr-call-' + (data.call_id || Date.now()),
          requireInteraction: true, // Keep notification until user acts
          vibrate: [500, 200, 500, 200, 500], // Longer vibration for calls
          actions: [
            { action: 'answer', title: '✓ Answer' },
            { action: 'reject', title: '✗ Decline' }
          ],
          data: {
            type: 'call',
            callId: data.call_id,
            callerId: data.caller_id,
            callerName: data.caller_name,
            callType: data.call_type,
            url: '/chat'
          }
        };
      }
      // Handle MESSAGE notifications
      else if (data.type === 'message' || data.conversation_id) {
        const sender = data.sender ? JSON.parse(data.sender) : {};
        const message = data.message ? JSON.parse(data.message) : {};
        
        title = sender.username || data.senderName || 'New Message';
        notificationOptions = {
          ...notificationOptions,
          body: message.content || data.messageContent || 'You have a new message',
          icon: sender.avatar_url || data.senderAvatar || '/chatr-logo.png',
          tag: 'chatr-msg-' + (data.conversation_id || Date.now()),
          actions: [
            { action: 'reply', title: 'Reply' },
            { action: 'view', title: 'View' }
          ],
          data: {
            type: 'message',
            conversationId: data.conversation_id,
            url: '/chat/' + data.conversation_id
          }
        };
      }
      // Generic notification
      else {
        title = data.title || title;
        notificationOptions.body = data.body || data.message || 'You have a new notification';
        notificationOptions.data = data;
      }
    } catch (e) {
      console.error('Error parsing push data:', e);
      notificationOptions.body = event.data.text() || 'You have a new notification';
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, notificationOptions)
  );
});

// Notification Click Handler - Enhanced for Calls
self.addEventListener('notificationclick', (event) => {
  console.log('📲 Notification clicked:', event.action);
  event.notification.close();

  const data = event.notification.data || {};
  let urlToOpen = data.url || '/';

  // Handle call notification actions
  if (data.type === 'call') {
    if (event.action === 'answer') {
      urlToOpen = '/chat?answerCall=' + data.callId;
    } else if (event.action === 'reject') {
      // Just close notification, reject handled by app
      return;
    }
  }
  
  // Handle message notification actions
  if (data.type === 'message') {
    if (event.action === 'reply' || event.action === 'view') {
      urlToOpen = '/chat/' + data.conversationId;
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        // Focus existing window if available
        for (let client of windowClients) {
          if ('focus' in client) {
            client.focus();
            // Navigate to the correct URL
            client.postMessage({
              type: 'NAVIGATE',
              url: urlToOpen,
              callData: data.type === 'call' ? data : null
            });
            return;
          }
        }
        // Open new window if none exists
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Message handler for communication with app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(RUNTIME_CACHE).then(cache => {
        return cache.addAll(event.data.urls);
      })
    );
  }
});

// Helper Functions

async function syncMessages() {
  try {
    const db = await openDB();
    const tx = db.transaction('pending_messages', 'readonly');
    const store = tx.objectStore('pending_messages');
    const messages = await store.getAll();
    
    for (const message of messages) {
      try {
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message)
        });
        
        if (response.ok) {
          const deleteTx = db.transaction('pending_messages', 'readwrite');
          const deleteStore = deleteTx.objectStore('pending_messages');
          await deleteStore.delete(message.id);
        }
      } catch (error) {
        console.error('Failed to sync message:', error);
      }
    }
  } catch (error) {
    console.error('Sync messages failed:', error);
  }
}

async function syncContacts() {
  try {
    console.log('Syncing contacts...');
    // Implement contact sync logic
  } catch (error) {
    console.error('Sync contacts failed:', error);
  }
}

async function performDailySync() {
  try {
    console.log('Performing daily sync...');
    await Promise.all([
      syncMessages(),
      syncContacts(),
      checkNewMessages()
    ]);
  } catch (error) {
    console.error('Daily sync failed:', error);
  }
}

async function checkNewMessages() {
  try {
    const response = await fetch('/api/messages/check');
    if (response.ok) {
      const data = await response.json();
      if (data.hasNew) {
        await self.registration.showNotification('Chatr', {
          body: 'You have new messages',
          icon: '/chatr-logo.png',
          badge: '/chatr-logo.png'
        });
      }
    }
  } catch (error) {
    console.error('Check messages failed:', error);
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ChatrDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending_messages')) {
        db.createObjectStore('pending_messages', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}
