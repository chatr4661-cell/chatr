// One-release cleanup worker for the retired app-shell cache.
// Push notifications continue through /firebase-messaging-sw.js.
function isChatrAppCache(name) {
  if (name.startsWith('chatr-cache-') ||
      name.startsWith('chatr-runtime-') ||
      name.startsWith('chatr-images-') ||
      name.startsWith('chatr-api-')) {
    return true;
  }

  const isWorkboxCache = /(^|-)precache-v\d+-|(^|-)runtime-|(^|-)googleAnalytics-/.test(name);
  return isWorkboxCache && name.endsWith(self.registration.scope);
}

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const cacheNames = await caches.keys();
      const appCaches = cacheNames.filter(isChatrAppCache);
      await Promise.allSettled(appCaches.map((name) => caches.delete(name)));
      await self.clients.claim();

      const windowClients = await self.clients.matchAll({ type: 'window' });
      await Promise.allSettled(windowClients.map((client) => client.navigate(client.url)));
    } finally {
      await self.registration.unregister();
    }
  })());
});
